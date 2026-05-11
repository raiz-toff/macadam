/**
 * Macadam — core UI component library (F8).
 *
 * All components are plain JS functions that either return an HTML string or mount
 * a node into one of the well-known shell hosts: `#modal-overlay`, `#toast-container`,
 * or `document.body` (for FAB / drawer / numeric keypad). No framework, no virtual DOM.
 *
 * Component chrome lives in `src/css/components.css` — no inline styles for layout
 * or theming (only stateful CSS custom properties such as `--platform-color`).
 *
 * Accessibility (per plan F8):
 *   - Modals: `role="dialog"`, `aria-modal="true"`, focus trap, Esc + backdrop close,
 *     focus returns to triggering element on close (Feature 254).
 *   - Toasts: `role="status"` (info/success) or `role="alert"` (error/warning),
 *     `aria-live="polite"` host (Feature 253).
 *   - Progress ring: `aria-valuenow / aria-valuemin / aria-valuemax / aria-valuetext`.
 *   - FAB / drawer close buttons carry localized `aria-label`.
 *
 * Touch targets default to >= 44×44px via the CSS system (Feature 255).
 *
 * All user-facing copy is fetched through `t()` from `src/utils/strings.js`.
 */

import { getIcon } from './icons.js';
import { t } from '../utils/strings.js';
import { bus, SHIFT_TIMER_START, SHIFT_TIMER_STOP } from '../core/events.js';
import { store } from '../core/store.js';
import { PlatformRegistry } from '../registry/platforms/index.js';

/* ------------------------------------------------------------------------- */
/* Small helpers                                                             */
/* ------------------------------------------------------------------------- */

/** @param {unknown} s */
function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** @param {unknown} v */
function escapeAttr(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

const FOCUSABLE_SELECTOR =
  [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'details summary',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

/** @param {Element} root */
function getFocusableElements(root) {
  return /** @type {HTMLElement[]} */ (Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR))).filter(
    (el) => !el.hasAttribute('aria-hidden') && (el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement),
  );
}

function getModalHost() {
  return document.getElementById('modal-overlay') || document.body;
}

function getToastHost() {
  return document.getElementById('toast-container') || document.body;
}

function reducedMotionEnabled() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* ------------------------------------------------------------------------- */
/* MacadamModal                                                              */
/* ------------------------------------------------------------------------- */

/**
 * @typedef {Object} ModalAction
 * @property {string} label
 * @property {string} [class] CSS class for the button (defaults to `btn btn-secondary`)
 * @property {(api: ModalHandle) => void} [onClick]
 * @property {boolean} [close] If false, the modal stays open after click. Default true.
 * @property {boolean} [autofocus] If true, this button gets initial focus
 */

/**
 * @typedef {Object} ModalOptions
 * @property {string} [title]
 * @property {string | Node} [content] HTML string or DOM node
 * @property {ModalAction[]} [actions]
 * @property {() => void} [onClose]
 * @property {'sm' | 'md' | 'lg' | 'xl'} [size]
 * @property {boolean} [dismissible] Allow Esc + backdrop close. Default true.
 * @property {string} [ariaLabel] Override aria-label (otherwise uses title)
 * @property {string} [role] Defaults to `dialog`. Use `alertdialog` for destructive flows.
 */

/**
 * @typedef {Object} ModalHandle
 * @property {HTMLElement} root The `.modal-dialog` element
 * @property {HTMLElement} backdrop The `.modal-backdrop` element
 * @property {HTMLElement} body The `.modal-body` content slot
 * @property {() => void} close
 */

/** @type {ModalHandle[]} */
const modalStack = [];

function topModal() {
  return modalStack.length > 0 ? modalStack[modalStack.length - 1] : null;
}

/** @param {KeyboardEvent} event */
function handleModalKeydown(event) {
  const top = topModal();
  if (!top) return;
  if (event.key === 'Escape') {
    const dismissible = top.root.dataset.dismissible !== 'false';
    if (dismissible) {
      event.preventDefault();
      top.close();
    }
    return;
  }
  if (event.key === 'Tab') {
    const focusable = getFocusableElements(top.root);
    if (focusable.length === 0) {
      event.preventDefault();
      top.root.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = /** @type {HTMLElement | null} */ (document.activeElement);
    if (event.shiftKey && (active === first || !top.root.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !top.root.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  }
}

/**
 * Show a modal dialog with focus trap, Esc + backdrop close, ARIA wiring.
 * @param {ModalOptions} [opts]
 * @returns {ModalHandle}
 */
export function showModal(opts = {}) {
  const {
    title = '',
    content = '',
    actions = [],
    onClose,
    size = 'md',
    dismissible = true,
    role = 'dialog',
    ariaLabel,
  } = opts;

  const host = getModalHost();
  const trigger = /** @type {HTMLElement | null} */ (document.activeElement);

  const backdrop = document.createElement('div');
  backdrop.className = 'macadam-modal-backdrop';
  backdrop.dataset.macadamModal = '';

  const dialog = document.createElement('div');
  dialog.className = `macadam-modal macadam-modal--${size}`;
  dialog.setAttribute('role', role);
  dialog.setAttribute('aria-modal', 'true');
  dialog.tabIndex = -1;
  const labelText = ariaLabel || (typeof title === 'string' ? title : '');
  if (labelText) dialog.setAttribute('aria-label', labelText);
  dialog.dataset.dismissible = dismissible ? 'true' : 'false';

  const headerHtml = `
    <div class="macadam-modal-header">
      <h2 class="macadam-modal-title">${escapeHtml(title)}</h2>
      <button type="button" class="macadam-modal-close" aria-label="${escapeAttr(t('ui.modal.close'))}">${getIcon('x', 18, 'macadam-modal-close-icon')}</button>
    </div>`;
  dialog.innerHTML = `${title ? headerHtml : ''}<div class="macadam-modal-body"></div><div class="macadam-modal-footer" hidden></div>`;

  const bodyEl = /** @type {HTMLElement} */ (dialog.querySelector('.macadam-modal-body'));
  if (content instanceof Node) {
    bodyEl.appendChild(content);
  } else if (typeof content === 'string') {
    bodyEl.innerHTML = content;
  }

  const footerEl = /** @type {HTMLElement} */ (dialog.querySelector('.macadam-modal-footer'));
  if (actions.length > 0) {
    footerEl.hidden = false;
    for (const action of actions) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = action.class || 'btn btn-secondary';
      btn.textContent = action.label || '';
      if (action.autofocus) btn.dataset.autofocus = 'true';
      btn.addEventListener('click', () => {
        try {
          action.onClick?.(handle);
        } catch (err) {
          console.error('[macadam modal] action handler failed', err);
        }
        if (action.close !== false) handle.close();
      });
      footerEl.appendChild(btn);
    }
  }

  backdrop.appendChild(dialog);
  host.appendChild(backdrop);

  if (modalStack.length === 0) {
    document.addEventListener('keydown', handleModalKeydown, true);
    document.body.classList.add('macadam-modal-open');
  }

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop && dialog.dataset.dismissible !== 'false') handle.close();
  });

  const closeBtn = dialog.querySelector('.macadam-modal-close');
  if (closeBtn) closeBtn.addEventListener('click', () => handle.close());

  if (!reducedMotionEnabled()) {
    backdrop.classList.add('macadam-modal-backdrop--enter');
    dialog.classList.add('macadam-modal--enter');
    requestAnimationFrame(() => {
      backdrop.classList.add('is-open');
      dialog.classList.add('is-open');
    });
  } else {
    backdrop.classList.add('is-open');
    dialog.classList.add('is-open');
  }

  let closed = false;
  /** @type {ModalHandle} */
  const handle = {
    root: dialog,
    backdrop,
    body: bodyEl,
    close: () => {
      if (closed) return;
      closed = true;
      backdrop.classList.remove('is-open');
      dialog.classList.add('is-closing');
      const idx = modalStack.indexOf(handle);
      if (idx >= 0) modalStack.splice(idx, 1);
      const finish = () => {
        backdrop.remove();
        if (modalStack.length === 0) {
          document.removeEventListener('keydown', handleModalKeydown, true);
          document.body.classList.remove('macadam-modal-open');
        }
        try {
          onClose?.();
        } catch (err) {
          console.error('[macadam modal] onClose failed', err);
        }
        if (trigger && typeof trigger.focus === 'function' && document.contains(trigger)) {
          try {
            trigger.focus();
          } catch {
            /* element no longer focusable */
          }
        }
      };
      if (reducedMotionEnabled()) finish();
      else setTimeout(finish, 160);
    },
  };
  modalStack.push(handle);

  setTimeout(() => {
    const auto = dialog.querySelector('[data-autofocus="true"]');
    const focusable = getFocusableElements(dialog);
    const first =
      (auto instanceof HTMLElement && auto) ||
      focusable[0] ||
      dialog;
    try {
      first.focus({ preventScroll: true });
    } catch {
      /* ignore */
    }
  }, 0);

  return handle;
}

/** Close the top-most open modal (if any). */
export function closeModal() {
  topModal()?.close();
}

/* ------------------------------------------------------------------------- */
/* MacadamConfirm                                                            */
/* ------------------------------------------------------------------------- */

/**
 * @typedef {Object} ConfirmOptions
 * @property {string} [title]
 * @property {string} [message]
 * @property {string} [confirmLabel]
 * @property {string} [cancelLabel]
 * @property {string} [confirmClass] CSS class for confirm button (default `btn btn-primary`)
 * @property {string} [requireType] If set, user must type this string before confirm enables.
 * @property {() => void | Promise<void>} [onConfirm]
 * @property {() => void} [onCancel]
 */

/**
 * Show a confirmation modal. Supports type-to-confirm gating for danger zones
 * (Features 20, 180) via the `requireType` option.
 *
 * @param {ConfirmOptions} [opts]
 * @returns {ModalHandle}
 */
export function showConfirm(opts = {}) {
  const {
    title = t('ui.confirm.title'),
    message = '',
    confirmLabel = t('common.confirm'),
    cancelLabel = t('common.cancel'),
    confirmClass = 'btn btn-primary',
    requireType,
    onConfirm,
    onCancel,
  } = opts;

  const wrap = document.createElement('div');
  wrap.className = 'macadam-confirm';
  const msgId = `mc-msg-${Math.random().toString(36).slice(2, 9)}`;

  if (message) {
    const p = document.createElement('p');
    p.id = msgId;
    p.className = 'macadam-confirm-message';
    p.textContent = message;
    wrap.appendChild(p);
  }

  /** @type {HTMLInputElement | null} */
  let typeInput = null;
  if (typeof requireType === 'string' && requireType.length > 0) {
    const group = document.createElement('label');
    group.className = 'macadam-confirm-type input-group';
    const lbl = document.createElement('span');
    lbl.className = 'input-label';
    lbl.textContent = t('ui.confirm.typeToConfirm').replace('{value}', requireType);
    typeInput = document.createElement('input');
    typeInput.type = 'text';
    typeInput.className = 'input';
    typeInput.autocomplete = 'off';
    typeInput.setAttribute('aria-label', lbl.textContent);
    group.appendChild(lbl);
    group.appendChild(typeInput);
    wrap.appendChild(group);
  }

  /** @type {ModalAction} */
  const cancelAction = {
    label: cancelLabel,
    class: 'btn btn-secondary',
    onClick: () => {
      try {
        onCancel?.();
      } catch (err) {
        console.error('[macadam confirm] onCancel failed', err);
      }
    },
  };
  /** @type {ModalAction} */
  const confirmAction = {
    label: confirmLabel,
    class: confirmClass,
    autofocus: !typeInput,
    onClick: () => {
      try {
        const r = onConfirm?.();
        if (r && typeof /** @type {Promise<unknown>} */ (r).then === 'function') {
          /** @type {Promise<unknown>} */ (r).catch((err) =>
            console.error('[macadam confirm] onConfirm rejected', err),
          );
        }
      } catch (err) {
        console.error('[macadam confirm] onConfirm failed', err);
      }
    },
  };

  const handle = showModal({
    title,
    content: wrap,
    role: 'alertdialog',
    size: 'sm',
    actions: [cancelAction, confirmAction],
    onClose: () => {
      /* fired after either action; cancel + confirm callbacks fire on click */
    },
    ariaLabel: title,
  });

  if (msgId) handle.root.setAttribute('aria-describedby', msgId);

  if (typeInput) {
    /** @type {HTMLButtonElement | null} */
    const confirmBtn = handle.root.querySelector(`.macadam-modal-footer ${confirmClass.split(' ').map((c) => `.${c}`).join('')}`);
    const allBtns = /** @type {NodeListOf<HTMLButtonElement>} */ (
      handle.root.querySelectorAll('.macadam-modal-footer button')
    );
    const realConfirm = confirmBtn || allBtns[allBtns.length - 1] || null;
    if (realConfirm) {
      realConfirm.disabled = true;
      realConfirm.setAttribute('aria-disabled', 'true');
      typeInput.addEventListener('input', () => {
        const matches = typeInput.value === requireType;
        realConfirm.disabled = !matches;
        if (matches) realConfirm.removeAttribute('aria-disabled');
        else realConfirm.setAttribute('aria-disabled', 'true');
      });
    }
    setTimeout(() => {
      try {
        typeInput.focus({ preventScroll: true });
      } catch {
        /* ignore */
      }
    }, 30);
  }

  return handle;
}

/* ------------------------------------------------------------------------- */
/* MacadamToast                                                              */
/* ------------------------------------------------------------------------- */

/**
 * @typedef {'success' | 'error' | 'warning' | 'info' | 'celebration'} ToastType
 */

/**
 * @typedef {Object} ToastOptions
 * @property {string} message
 * @property {ToastType} [type]
 * @property {number} [duration] ms before auto-dismiss. 0 = sticky.
 * @property {() => void} [action] Click handler for the action button
 * @property {string} [actionLabel]
 */

const MAX_TOASTS = 3;
/** @type {{ root: HTMLElement, close: () => void }[]} */
const toastQueue = [];

/**
 * Show a transient toast notification. Stacks up to 3 visible toasts.
 * @param {ToastOptions} opts
 * @returns {{ root: HTMLElement, close: () => void }}
 */
export function showToast(opts) {
  const { message, type = 'info', duration = 4000, action, actionLabel } = opts || {};
  const host = getToastHost();
  host.setAttribute('aria-live', type === 'error' || type === 'warning' ? 'assertive' : 'polite');
  host.setAttribute('aria-atomic', 'true');

  const root = document.createElement('div');
  root.className = `macadam-toast macadam-toast--${type}`;
  root.setAttribute('role', type === 'error' || type === 'warning' ? 'alert' : 'status');
  const iconName = (
    type === 'success'
      ? 'check'
      : type === 'error'
        ? 'warning'
        : type === 'warning'
          ? 'warning'
          : type === 'celebration'
            ? 'star'
            : 'info'
  );

  const messageId = `mt-msg-${Math.random().toString(36).slice(2, 9)}`;
  root.innerHTML = `
    <span class="macadam-toast-icon" aria-hidden="true">${getIcon(iconName, 18, 'macadam-toast-icon-svg')}</span>
    <span id="${messageId}" class="macadam-toast-message"></span>
    <span class="macadam-toast-actions"></span>
    <button type="button" class="macadam-toast-close" aria-label="${escapeAttr(t('ui.toast.dismiss'))}">${getIcon('x', 14, 'macadam-toast-close-icon')}</button>
  `;
  const msgEl = root.querySelector('.macadam-toast-message');
  if (msgEl) msgEl.textContent = String(message ?? '');
  root.setAttribute('aria-describedby', messageId);

  const actionsHost = /** @type {HTMLElement} */ (root.querySelector('.macadam-toast-actions'));
  if (typeof action === 'function' && actionLabel) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'macadam-toast-action btn btn-ghost btn-sm';
    btn.textContent = actionLabel;
    btn.addEventListener('click', () => {
      try {
        action();
      } catch (err) {
        console.error('[macadam toast] action failed', err);
      }
      handle.close();
    });
    actionsHost.appendChild(btn);
  }

  /** @type {ReturnType<typeof setTimeout> | null} */
  let timer = null;
  const handle = {
    root,
    close: () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      const idx = toastQueue.indexOf(handle);
      if (idx >= 0) toastQueue.splice(idx, 1);
      root.classList.remove('is-open');
      root.classList.add('is-closing');
      const finish = () => {
        if (root.parentElement) root.parentElement.removeChild(root);
      };
      if (reducedMotionEnabled()) finish();
      else setTimeout(finish, 180);
    },
  };

  root.querySelector('.macadam-toast-close')?.addEventListener('click', () => handle.close());

  host.appendChild(root);
  toastQueue.push(handle);

  if (!reducedMotionEnabled()) {
    requestAnimationFrame(() => root.classList.add('is-open'));
  } else {
    root.classList.add('is-open');
  }

  while (toastQueue.length > MAX_TOASTS) {
    const oldest = toastQueue[0];
    oldest.close();
  }

  if (duration > 0) {
    timer = setTimeout(() => handle.close(), duration);
  }

  return handle;
}

/**
 * @typedef {Object} NotifyAction
 * @property {string} label
 * @property {(close: () => void) => void} [onClick]
 * @property {string} [class]
 */

/**
 * @typedef {Object} NotifyCardOptions
 * @property {string} title
 * @property {string} [message]
 * @property {string} [icon] icons.js key (default `info`)
 * @property {NotifyAction[]} [actions]
 * @property {ToastType} [type]
 * @property {number} [duration] ms before auto-dismiss. 0 = sticky (default).
 */

/**
 * Show a richer "MacadamNotify" card variant of a toast — supports title, message,
 * icon, and an actions row. Mounted into `#toast-container`. (Used by Phase 2
 * Features 195–207 notification triggers.)
 *
 * @param {NotifyCardOptions} opts
 * @returns {{ root: HTMLElement, close: () => void }}
 */
export function showNotifyCard(opts) {
  const { title, message = '', icon = 'info', actions = [], type = 'info', duration = 0 } = opts || {};
  const host = getToastHost();
  host.setAttribute('aria-live', type === 'error' || type === 'warning' ? 'assertive' : 'polite');
  host.setAttribute('aria-atomic', 'true');

  const root = document.createElement('div');
  root.className = `macadam-notify macadam-notify--${type}`;
  root.setAttribute('role', type === 'error' || type === 'warning' ? 'alert' : 'status');
  const titleId = `mn-title-${Math.random().toString(36).slice(2, 9)}`;
  root.setAttribute('aria-labelledby', titleId);

  root.innerHTML = `
    <span class="macadam-notify-icon" aria-hidden="true">${getIcon(icon, 22, 'macadam-notify-icon-svg')}</span>
    <div class="macadam-notify-body">
      <h3 id="${titleId}" class="macadam-notify-title"></h3>
      <p class="macadam-notify-message"></p>
      <div class="macadam-notify-actions"></div>
    </div>
    <button type="button" class="macadam-notify-close" aria-label="${escapeAttr(t('ui.toast.dismiss'))}">${getIcon('x', 14, 'macadam-notify-close-icon')}</button>
  `;
  const tEl = root.querySelector('.macadam-notify-title');
  if (tEl) tEl.textContent = String(title ?? '');
  const mEl = root.querySelector('.macadam-notify-message');
  if (mEl) {
    if (message) mEl.textContent = String(message);
    else mEl.remove();
  }

  const actionsHost = /** @type {HTMLElement} */ (root.querySelector('.macadam-notify-actions'));
  if (actions.length === 0) actionsHost.remove();
  else {
    for (const a of actions) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = a.class || 'btn btn-secondary btn-sm';
      btn.textContent = a.label;
      btn.addEventListener('click', () => {
        try {
          a.onClick?.(handle.close);
        } catch (err) {
          console.error('[macadam notify] action failed', err);
        }
      });
      actionsHost.appendChild(btn);
    }
  }

  /** @type {ReturnType<typeof setTimeout> | null} */
  let timer = null;
  const handle = {
    root,
    close: () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      root.classList.remove('is-open');
      root.classList.add('is-closing');
      const finish = () => {
        if (root.parentElement) root.parentElement.removeChild(root);
      };
      if (reducedMotionEnabled()) finish();
      else setTimeout(finish, 200);
    },
  };

  root.querySelector('.macadam-notify-close')?.addEventListener('click', () => handle.close());

  host.appendChild(root);
  if (!reducedMotionEnabled()) requestAnimationFrame(() => root.classList.add('is-open'));
  else root.classList.add('is-open');

  if (duration > 0) timer = setTimeout(() => handle.close(), duration);

  return handle;
}

/* ------------------------------------------------------------------------- */
/* FAB                                                                       */
/* ------------------------------------------------------------------------- */

/**
 * @typedef {Object} FabOptions
 * @property {() => void} [onAdd]
 * @property {() => void} [onEndShift]
 */

/** @type {HTMLButtonElement | null} */
let fabEl = null;
let fabState = /** @type {'add' | 'end'} */ ('add');
/** @type {FabOptions} */
let fabHandlers = {};

function applyFabMode(mode) {
  if (!fabEl) return;
  fabState = mode;
  if (mode === 'end') {
    fabEl.dataset.mode = 'end';
    fabEl.classList.add('macadam-fab--end');
    fabEl.setAttribute('aria-label', t('ui.fab.endShift'));
    fabEl.innerHTML = getIcon('clock', 22, 'macadam-fab-icon') + `<span class="macadam-fab-label">${escapeHtml(t('ui.fab.endShift'))}</span>`;
  } else {
    fabEl.dataset.mode = 'add';
    fabEl.classList.remove('macadam-fab--end');
    fabEl.setAttribute('aria-label', t('ui.fab.addShift'));
    fabEl.innerHTML = getIcon('plus', 22, 'macadam-fab-icon');
  }
}

function fabOnClick() {
  try {
    if (fabState === 'end') fabHandlers.onEndShift?.();
    else fabHandlers.onAdd?.();
  } catch (err) {
    console.error('[macadam fab] click handler failed', err);
  }
}

let fabKeyboardHandler = /** @type {(() => void) | null} */ (null);

function wireFabKeyboardVisibility() {
  if (typeof window === 'undefined') return;
  const vv = window.visualViewport;
  if (!vv) return;
  const onResize = () => {
    if (!fabEl) return;
    const ratio = vv.height / window.innerHeight;
    const keyboardOpen = ratio < 0.7;
    fabEl.classList.toggle('macadam-fab--hidden', keyboardOpen);
  };
  vv.addEventListener('resize', onResize);
  fabKeyboardHandler = () => vv.removeEventListener('resize', onResize);
}

/**
 * Initialize the floating action button. Idempotent — calling twice updates handlers.
 * @param {FabOptions} [opts]
 * @returns {{ setMode: (mode: 'add' | 'end') => void, destroy: () => void, element: HTMLButtonElement }}
 */
export function initFAB(opts = {}) {
  fabHandlers = { ...fabHandlers, ...opts };

  if (!fabEl) {
    fabEl = document.createElement('button');
    fabEl.type = 'button';
    fabEl.id = 'macadam-fab';
    fabEl.className = 'macadam-fab';
    document.body.appendChild(fabEl);
    fabEl.addEventListener('click', fabOnClick);
    wireFabKeyboardVisibility();
  }

  const timer = store.get('activeShiftTimer');
  applyFabMode(timer ? 'end' : 'add');

  bus.on(SHIFT_TIMER_START, () => applyFabMode('end'));
  bus.on(SHIFT_TIMER_STOP, () => applyFabMode('add'));
  store.subscribe('activeShiftTimer', (v) => applyFabMode(v ? 'end' : 'add'));

  return {
    setMode: (mode) => applyFabMode(mode),
    destroy: () => {
      if (fabEl && fabEl.parentElement) fabEl.parentElement.removeChild(fabEl);
      fabEl = null;
      if (fabKeyboardHandler) {
        fabKeyboardHandler();
        fabKeyboardHandler = null;
      }
    },
    element: fabEl,
  };
}

/* ------------------------------------------------------------------------- */
/* Bottom drawer                                                             */
/* ------------------------------------------------------------------------- */

/**
 * @typedef {Object} DrawerOptions
 * @property {string} [title]
 * @property {string | Node} [content]
 * @property {() => void} [onClose]
 * @property {number[]} [snapPoints] Vh fractions, e.g. [0.5, 0.9]. Default [0.5, 0.9].
 * @property {boolean} [dismissible] Default true.
 */

/**
 * @typedef {Object} DrawerHandle
 * @property {HTMLElement} root The wrapping `.drawer` element
 * @property {HTMLElement} panel The `.drawer-panel` content host
 * @property {HTMLElement} body Content slot inside the panel
 * @property {(snap: number) => void} setSnap
 * @property {() => void} close
 */

/** @type {DrawerHandle[]} */
const drawerStack = [];

/** @param {KeyboardEvent} e */
function drawerKeydown(e) {
  if (e.key !== 'Escape') return;
  const top = drawerStack[drawerStack.length - 1];
  if (!top) return;
  if (top.root.dataset.dismissible !== 'false') {
    e.preventDefault();
    top.close();
  }
}

/**
 * Open a bottom drawer. Swipe-to-close on touch devices; backdrop dim + Esc close.
 * @param {DrawerOptions} [opts]
 * @returns {DrawerHandle}
 */
export function showDrawer(opts = {}) {
  const { title = '', content = '', onClose, snapPoints = [0.5, 0.9], dismissible = true } = opts;

  const trigger = /** @type {HTMLElement | null} */ (document.activeElement);

  const root = document.createElement('div');
  root.className = 'drawer macadam-drawer';
  root.dataset.dismissible = dismissible ? 'true' : 'false';
  root.style.setProperty('--drawer-snap', String(snapPoints[0] ?? 0.5));

  const backdrop = document.createElement('div');
  backdrop.className = 'drawer-backdrop';
  const panel = document.createElement('div');
  panel.className = 'drawer-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  if (title) panel.setAttribute('aria-label', title);

  panel.innerHTML = `
    <div class="macadam-drawer-handle" aria-hidden="true"></div>
    <div class="macadam-drawer-header" ${title ? '' : 'hidden'}>
      <h2 class="macadam-drawer-title">${escapeHtml(title)}</h2>
      <button type="button" class="macadam-drawer-close" aria-label="${escapeAttr(t('ui.drawer.close'))}">${getIcon('x', 16, 'macadam-drawer-close-icon')}</button>
    </div>
    <div class="macadam-drawer-body"></div>
  `;
  const body = /** @type {HTMLElement} */ (panel.querySelector('.macadam-drawer-body'));
  if (content instanceof Node) body.appendChild(content);
  else if (typeof content === 'string') body.innerHTML = content;

  root.appendChild(backdrop);
  root.appendChild(panel);
  document.body.appendChild(root);

  backdrop.addEventListener('click', () => {
    if (root.dataset.dismissible !== 'false') handle.close();
  });
  panel.querySelector('.macadam-drawer-close')?.addEventListener('click', () => handle.close());

  if (drawerStack.length === 0) document.addEventListener('keydown', drawerKeydown, true);

  /* swipe-to-close on touch */
  let touchStartY = 0;
  let touchCurrentY = 0;
  let dragging = false;
  panel.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    touchStartY = e.touches[0].clientY;
    touchCurrentY = touchStartY;
    dragging = true;
    panel.classList.add('is-dragging');
  });
  panel.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    touchCurrentY = e.touches[0].clientY;
    const dy = Math.max(0, touchCurrentY - touchStartY);
    panel.style.transform = `translateY(${dy}px)`;
  });
  panel.addEventListener('touchend', () => {
    if (!dragging) return;
    dragging = false;
    panel.classList.remove('is-dragging');
    const dy = touchCurrentY - touchStartY;
    panel.style.transform = '';
    if (dy > 120 && root.dataset.dismissible !== 'false') handle.close();
  });

  if (!reducedMotionEnabled()) {
    requestAnimationFrame(() => root.classList.add('is-open'));
  } else {
    root.classList.add('is-open');
  }

  let closed = false;
  /** @type {DrawerHandle} */
  const handle = {
    root,
    panel,
    body,
    setSnap(snap) {
      const v = Math.min(0.95, Math.max(0.2, Number(snap) || 0.5));
      root.style.setProperty('--drawer-snap', String(v));
    },
    close: () => {
      if (closed) return;
      closed = true;
      root.classList.remove('is-open');
      const idx = drawerStack.indexOf(handle);
      if (idx >= 0) drawerStack.splice(idx, 1);
      if (drawerStack.length === 0) document.removeEventListener('keydown', drawerKeydown, true);
      const finish = () => {
        if (root.parentElement) root.parentElement.removeChild(root);
        try {
          onClose?.();
        } catch (err) {
          console.error('[macadam drawer] onClose failed', err);
        }
        if (trigger && typeof trigger.focus === 'function' && document.contains(trigger)) {
          try {
            trigger.focus();
          } catch {
            /* ignore */
          }
        }
      };
      if (reducedMotionEnabled()) finish();
      else setTimeout(finish, 250);
    },
  };
  drawerStack.push(handle);

  setTimeout(() => {
    const focusable = getFocusableElements(panel);
    if (focusable[0]) {
      try {
        focusable[0].focus({ preventScroll: true });
      } catch {
        /* ignore */
      }
    } else {
      panel.tabIndex = -1;
      try {
        panel.focus({ preventScroll: true });
      } catch {
        /* ignore */
      }
    }
  }, 0);

  return handle;
}

/* ------------------------------------------------------------------------- */
/* Progress ring                                                             */
/* ------------------------------------------------------------------------- */

/**
 * @typedef {Object} ProgressRingOptions
 * @property {number} value Numerator
 * @property {number} max Denominator (defaults 100)
 * @property {number} [size] px diameter (default 64)
 * @property {number} [strokeWidth] (default 6)
 * @property {string} [color] CSS color (default `var(--color-brand)`)
 * @property {string} [label] short label inside the ring
 * @property {string} [ariaLabel]
 * @property {boolean} [animated] Apply ring-fill animation (default true)
 */

/**
 * Render a circular progress ring as HTML.
 * @param {ProgressRingOptions} opts
 * @returns {string}
 */
export function renderProgressRing(opts) {
  const {
    value = 0,
    max = 100,
    size = 64,
    strokeWidth = 6,
    color = 'var(--color-brand)',
    label = '',
    ariaLabel,
    animated = true,
  } = opts || {};
  const safeMax = Math.max(1, Number(max) || 100);
  const safeValue = Math.max(0, Math.min(safeMax, Number(value) || 0));
  const pct = Math.round((safeValue / safeMax) * 100);
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const aria = escapeAttr(ariaLabel || label || t('ui.progressRing.label'));
  const animatedClass = animated ? 'progress-ring--animated' : '';
  return `
    <div class="macadam-progress-ring ${animatedClass}" style="--ring-color:${escapeAttr(color)};--ring-size:${size}px" role="progressbar" aria-valuenow="${escapeAttr(String(safeValue))}" aria-valuemin="0" aria-valuemax="${escapeAttr(String(safeMax))}" aria-valuetext="${escapeAttr(String(pct) + '%')}" aria-label="${aria}">
      <svg class="progress-ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
        <circle class="progress-ring-bg" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${strokeWidth}"></circle>
        <circle class="progress-ring-fill" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${strokeWidth}"
          stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}"></circle>
      </svg>
      <span class="macadam-progress-ring-label">${escapeHtml(label || pct + '%')}</span>
    </div>
  `;
}

/* ------------------------------------------------------------------------- */
/* Skeleton loader                                                           */
/* ------------------------------------------------------------------------- */

/**
 * @param {'card' | 'list-item' | 'stat' | 'chart' | 'text'} [shape]
 * @returns {string}
 */
export function renderSkeleton(shape = 'card') {
  const label = escapeAttr(t('ui.skeleton.loading'));
  switch (shape) {
    case 'list-item':
      return `
        <div class="macadam-skeleton macadam-skeleton--list-item" role="status" aria-label="${label}">
          <span class="skeleton macadam-skeleton-avatar"></span>
          <span class="macadam-skeleton-lines">
            <span class="skeleton macadam-skeleton-line macadam-skeleton-line--lg"></span>
            <span class="skeleton macadam-skeleton-line macadam-skeleton-line--sm"></span>
          </span>
        </div>`;
    case 'stat':
      return `
        <div class="macadam-skeleton macadam-skeleton--stat card" role="status" aria-label="${label}">
          <span class="skeleton macadam-skeleton-line macadam-skeleton-line--sm"></span>
          <span class="skeleton macadam-skeleton-value"></span>
        </div>`;
    case 'chart':
      return `
        <div class="macadam-skeleton macadam-skeleton--chart card" role="status" aria-label="${label}">
          <span class="skeleton macadam-skeleton-chart-body"></span>
        </div>`;
    case 'text':
      return `
        <div class="macadam-skeleton macadam-skeleton--text" role="status" aria-label="${label}">
          <span class="skeleton macadam-skeleton-line macadam-skeleton-line--lg"></span>
          <span class="skeleton macadam-skeleton-line macadam-skeleton-line--md"></span>
          <span class="skeleton macadam-skeleton-line macadam-skeleton-line--sm"></span>
        </div>`;
    case 'card':
    default:
      return `
        <div class="macadam-skeleton macadam-skeleton--card card" role="status" aria-label="${label}">
          <span class="skeleton macadam-skeleton-line macadam-skeleton-line--lg"></span>
          <span class="skeleton macadam-skeleton-line macadam-skeleton-line--md"></span>
          <span class="skeleton macadam-skeleton-line macadam-skeleton-line--sm"></span>
        </div>`;
  }
}

/* ------------------------------------------------------------------------- */
/* Empty state                                                               */
/* ------------------------------------------------------------------------- */

/**
 * @typedef {Object} EmptyStateOptions
 * @property {string} [icon] icons.js key (default `info`)
 * @property {string} [title]
 * @property {string} [message]
 * @property {string} [action] hash route or arbitrary URL
 * @property {string} [actionLabel]
 * @property {string} [actionAttr] e.g. `data-action="open-form"` for delegated handlers
 */

/**
 * Render an empty-state block used by lists, dashboards, etc.
 * @param {EmptyStateOptions} [opts]
 * @returns {string}
 */
export function renderEmptyState(opts = {}) {
  const {
    icon = 'info',
    title = t('ui.emptyState.defaultTitle'),
    message = t('ui.emptyState.defaultMessage'),
    action,
    actionLabel,
    actionAttr,
  } = opts;
  const iconHtml = getIcon(icon, 36, 'macadam-empty-state-icon');
  let actionHtml = '';
  if (action && actionLabel) {
    if (action.startsWith('#') || /^https?:/i.test(action)) {
      actionHtml = `<a class="btn btn-primary" href="${escapeAttr(action)}">${escapeHtml(actionLabel)}</a>`;
    } else {
      actionHtml = `<button type="button" class="btn btn-primary" ${actionAttr ? actionAttr : `data-empty-action="${escapeAttr(action)}"`}>${escapeHtml(actionLabel)}</button>`;
    }
  } else if (actionLabel && actionAttr) {
    actionHtml = `<button type="button" class="btn btn-primary" ${actionAttr}>${escapeHtml(actionLabel)}</button>`;
  }
  return `
    <div class="empty-state macadam-empty-state">
      <span class="macadam-empty-state-icon-wrap" aria-hidden="true">${iconHtml}</span>
      <h3 class="macadam-empty-state-title">${escapeHtml(title)}</h3>
      ${message ? `<p class="macadam-empty-state-message">${escapeHtml(message)}</p>` : ''}
      ${actionHtml}
    </div>
  `;
}

/* ------------------------------------------------------------------------- */
/* Numeric keypad                                                            */
/* ------------------------------------------------------------------------- */

/**
 * @typedef {Object} KeypadOptions
 * @property {string | number} [value] initial value
 * @property {string} [currency] currency symbol prefix (e.g. `$`)
 * @property {string} [title]
 * @property {(value: string) => void} [onConfirm]
 * @property {() => void} [onCancel]
 * @property {boolean} [allowDecimal]
 */

/**
 * Large tap-friendly numeric keypad overlay for amount entry (Feature 36).
 * Built as a small modal.
 * @param {KeypadOptions} [opts]
 * @returns {ModalHandle}
 */
export function showNumericKeypad(opts = {}) {
  const {
    value = '',
    currency = '',
    title = t('ui.keypad.title'),
    onConfirm,
    onCancel,
    allowDecimal = true,
  } = opts;

  let buffer = String(value ?? '').replace(/[^0-9.]/g, '');

  const wrap = document.createElement('div');
  wrap.className = 'macadam-keypad';
  wrap.innerHTML = `
    <div class="macadam-keypad-display" aria-live="polite">
      <span class="macadam-keypad-currency" aria-hidden="true">${escapeHtml(currency)}</span>
      <span class="macadam-keypad-value" data-keypad-value></span>
    </div>
    <div class="macadam-keypad-grid" role="group" aria-label="${escapeAttr(title)}">
      ${['1', '2', '3', '4', '5', '6', '7', '8', '9']
        .map((n) => `<button type="button" class="macadam-keypad-key" data-key="${n}">${n}</button>`) 
        .join('')}
      <button type="button" class="macadam-keypad-key macadam-keypad-key--util" data-key="clear" aria-label="${escapeAttr(t('ui.keypad.clear'))}">${getIcon('x', 18)}</button>
      <button type="button" class="macadam-keypad-key" data-key="0">0</button>
      <button type="button" class="macadam-keypad-key macadam-keypad-key--util" data-key="back" aria-label="${escapeAttr(t('ui.keypad.backspace'))}">${getIcon('arrow-right', 18, 'macadam-keypad-back-icon')}</button>
      ${allowDecimal ? '<button type="button" class="macadam-keypad-key macadam-keypad-key--util" data-key=".">.</button>' : ''}
    </div>
  `;

  function updateDisplay() {
    const dEl = wrap.querySelector('[data-keypad-value]');
    if (dEl) dEl.textContent = buffer || '0';
  }
  updateDisplay();

  wrap.addEventListener('click', (e) => {
    const target = /** @type {HTMLElement | null} */ (e.target instanceof HTMLElement ? e.target.closest('[data-key]') : null);
    if (!target) return;
    const k = target.getAttribute('data-key');
    if (!k) return;
    if (k === 'clear') buffer = '';
    else if (k === 'back') buffer = buffer.slice(0, -1);
    else if (k === '.') {
      if (allowDecimal && !buffer.includes('.')) buffer = (buffer || '0') + '.';
    } else if (/^[0-9]$/.test(k)) {
      buffer = buffer + k;
    }
    updateDisplay();
  });

  const handle = showModal({
    title,
    content: wrap,
    size: 'sm',
    role: 'dialog',
    actions: [
      {
        label: t('common.cancel'),
        class: 'btn btn-secondary',
        onClick: () => {
          try {
            onCancel?.();
          } catch (err) {
            console.error('[macadam keypad] onCancel failed', err);
          }
        },
      },
      {
        label: t('ui.keypad.confirm'),
        class: 'btn btn-primary',
        autofocus: true,
        onClick: () => {
          try {
            onConfirm?.(buffer);
          } catch (err) {
            console.error('[macadam keypad] onConfirm failed', err);
          }
        },
      },
    ],
  });
  return handle;
}

/* ------------------------------------------------------------------------- */
/* Platform color + badge                                                    */
/* ------------------------------------------------------------------------- */

/** CSS theme tokens exist per catalog id — keep in sync via PlatformRegistry (Category A). */
const KNOWN_PLATFORMS = new Set(PlatformRegistry.getAll().map((p) => String(p.id || '').toLowerCase()));

/**
 * Resolve a CSS color reference for a given platform id. Falls back to brand.
 * @param {string} platformId
 * @returns {string}
 */
export function getPlatformColor(platformId) {
  const id = String(platformId || '').toLowerCase();
  if (KNOWN_PLATFORMS.has(id)) return `var(--color-${id})`;
  return 'var(--color-brand)';
}

/**
 * Render a small badge with the platform brand color.
 * @param {string} platformId
 * @param {string} [label]
 * @returns {string}
 */
export function renderPlatformBadge(platformId, label) {
  const id = String(platformId || '').toLowerCase();
  const color = getPlatformColor(id);
  const lbl = typeof label === 'string' && label.length > 0 ? label : id || t('app.platformAll');
  return `<span class="badge badge-platform" style="--platform-color:${escapeAttr(color)}" data-platform-id="${escapeAttr(id)}">${escapeHtml(lbl)}</span>`;
}
