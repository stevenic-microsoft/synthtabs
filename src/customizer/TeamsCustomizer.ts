import path from 'path';
import { Customizer } from './Customizer';

/**
 * Teams-specific customizer that overrides folder paths and the local
 * data-folder name for the SynthTabs fork.
 */
export class TeamsCustomizer extends Customizer {
    constructor() {
        super();
        this.addTransformInstructions(transformInstructions);
    }

    get localFolder(): string {
        return '.synthtabs';
    }

    get requiredPagesFolder(): string {
        return path.join(__dirname, '../../teams-required-pages');
    }

    get defaultPagesFolder(): string {
        return path.join(__dirname, '../../teams-default-pages');
    }

    get defaultThemesFolder(): string {
        return path.join(__dirname, '../../teams-default-themes');
    }

    get pageScriptsFolder(): string {
        return path.join(__dirname, '../../teams-page-scripts');
    }

    get serviceConnectorsFolder(): string {
        return path.join(__dirname, '../../teams-service-connectors');
    }

    get tabsListRoute(): string {
        return '/tabs';
    }
}

const transformInstructions = `The viewer panel automatically fills the full available space. App content stretches to fill the full viewer width and height so do not add the "full-viewer" class to the viewer-panel element.
Chat panel collapse/expand: The chat panel uses a header bar (.chat-panel-header) with a close button (.chat-panel-close) and a collapsed rail (.chat-rail) instead of the floating .chat-toggle button. Do NOT create or reference .chat-toggle elements. The page script handles close/expand behaviour and localStorage persistence automatically.
Prefer using the <UI_COMPONENTS> below when designing pages:

<UI_COMPONENTS>

## Button
<button class="mt-btn" data-style="accent" data-size="md">Button</button>
<button class="mt-btn" data-style="neutral" data-size="sm">Button</button>
<button class="mt-btn" data-style="outline" data-size="md">Button</button>
<button class="mt-btn" data-style="ghost" data-size="md">Button</button>
<button class="mt-btn" data-style="accent" data-icon-only aria-label="Icon button">
  <svg class="mt-btn__icon" aria-hidden="true">...</svg>
</button>
<div class="mt-btn-group">
  <button class="mt-btn" data-style="accent">Button</button>
  <button class="mt-btn mt-btn--split" data-style="accent" aria-label="More">▾</button>
</div>

## Alert
<div class="mt-alert" data-variant="error" role="status">
  <span class="mt-alert__icon" aria-hidden="true"></span>
  <span class="mt-alert__message">Message goes here</span>
  <button class="mt-alert__action" type="button">Action</button>
  <button class="mt-alert__dismiss" type="button" aria-label="Dismiss">×</button>
</div>

## Breadcrumb
<nav class="mt-breadcrumb" aria-label="Breadcrumb">
  <ol class="mt-breadcrumb__list">
    <li><a class="mt-link" href="#">Folder</a></li>
    <li class="mt-breadcrumb__sep" aria-hidden="true">›</li>
    <li><a class="mt-link" href="#">Folder</a></li>
    <li class="mt-breadcrumb__sep" aria-hidden="true">›</li>
    <li aria-current="page"><span class="mt-breadcrumb__current">Folder</span></li>
  </ol>
</nav>

## Card
<article class="mt-card" data-size="md" tabindex="0">
  <div class="mt-card__media"><img src="..." alt="" /></div>
  <div class="mt-card__body">
    <div class="mt-card__header">
      <div class="mt-card__text">
        <div class="mt-card__title">Fluent base card</div>
        <div class="mt-card__subtitle">Subtitle</div>
      </div>
      <button class="mt-card__menu" aria-label="More">⋯</button>
    </div>
  </div>
</article>

## Carousel
<section class="mt-carousel" aria-roledescription="carousel">
  <div class="mt-carousel__viewport">
    <div class="mt-carousel__track" style="transform:translateX(0);">
      <div class="mt-carousel__slide"><div class="mt-carousel__content">CONTENT</div></div>
    </div>
    <button class="mt-carousel__nav mt-carousel__nav--prev" aria-label="Previous">‹</button>
    <button class="mt-carousel__nav mt-carousel__nav--next" aria-label="Next">›</button>
  </div>
  <div class="mt-carousel__dots">
    <button class="mt-carousel__dot" aria-selected="true"></button>
    <button class="mt-carousel__dot"></button>
  </div>
</section>

## Checkbox
<label class="mt-checkbox">
  <input class="mt-checkbox__input" type="checkbox" />
  <span class="mt-checkbox__control" aria-hidden="true">
    <svg class="mt-checkbox__icon" viewBox="0 0 16 16"><path d="M4 8.5l2.5 2.5L12 5.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>
  </span>
  <span class="mt-checkbox__label">Label</span>
</label>

## Coachmark
<div class="mt-coachmark" role="dialog" aria-modal="true" aria-labelledby="cm-title">
  <div class="mt-coachmark__scrim"></div>
  <div class="mt-coachmark__panel" data-placement="bottom">
    <button class="mt-coachmark__close" aria-label="Close">×</button>
    <h3 id="cm-title" class="mt-coachmark__title">Not sure where to start?</h3>
    <div class="mt-coachmark__body">…</div>
    <div class="mt-coachmark__footer">
      <button class="mt-btn" data-style="neutral">Show me how</button>
      <button class="mt-btn" data-style="ghost">Close</button>
    </div>
  </div>
</div>

## Contextual Menu
<div class="mt-menu" role="menu" aria-label="Context menu">
  <button class="mt-menu__item" role="menuitem">
    <span class="mt-menu__icon" aria-hidden="true">⚡</span>
    <span class="mt-menu__label">Action</span>
    <span class="mt-menu__shortcut" aria-hidden="true">Ctrl+S</span>
  </button>
  <div class="mt-menu__divider" role="separator"></div>
  <div class="mt-menu__section" aria-hidden="true">Section</div>
  <button class="mt-menu__item" role="menuitem" aria-haspopup="menu">
    <span class="mt-menu__label">Action</span>
    <span class="mt-menu__submenu" aria-hidden="true">›</span>
  </button>
</div>

## Dialog
<div class="mt-dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-title">
  <div class="mt-dialog__scrim"></div>
  <div class="mt-dialog__panel" data-size="md">
    <header class="mt-dialog__header"><h2 id="dlg-title" class="mt-dialog__title">Dialog title</h2></header>
    <div class="mt-dialog__body">…</div>
    <div class="mt-dialog__error" role="alert">Error</div>
    <footer class="mt-dialog__footer">
      <button class="mt-btn" data-style="neutral">Secondary</button>
      <button class="mt-btn" data-style="accent">Primary</button>
    </footer>
  </div>
</div>

## Dropdown
<div class="mt-field" data-state="default">
  <label class="mt-field__label" for="dd1">Label</label>
  <button id="dd1" class="mt-dropdown" aria-haspopup="listbox" aria-expanded="false">
    <span class="mt-dropdown__value">Select</span>
    <span class="mt-dropdown__icon" aria-hidden="true">▾</span>
  </button>
  <div class="mt-field__error" role="alert">Error</div>
</div>

## Group List
<div class="mt-group">
  <button class="mt-group__header" aria-expanded="false" aria-controls="grp1">
    <span class="mt-group__chevron" aria-hidden="true">▸</span>
    <span class="mt-group__label">Label</span>
  </button>
  <div id="grp1" class="mt-group__content" hidden>…</div>
</div>

## Hyperlink
<a class="mt-link" href="#">Hyperlink</a>
<a class="mt-link mt-link--truncate" href="#">A very long hyperlink that should truncate</a>
<a class="mt-link" aria-disabled="true" tabindex="-1">Disabled</a>

## Input
<div class="mt-field" data-state="default">
  <label class="mt-field__label" for="in1">Label</label>
  <div class="mt-input" data-size="md">
    <input id="in1" class="mt-input__control" type="text" placeholder="Placeholder text" />
  </div>
  <div class="mt-field__hint">Optional hint</div>
</div>
<div class="mt-field" data-state="default">
  <div class="mt-input" data-size="md">
    <span class="mt-input__prefix mt-input__prefix--chip">Prefix</span>
    <input class="mt-input__control" type="text" placeholder="Placeholder" />
  </div>
</div>
<div class="mt-field" data-state="error">
  <label class="mt-field__label" for="in3">Email</label>
  <div class="mt-input" data-size="md">
    <input id="in3" class="mt-input__control" type="email" value="leorejsejcm" />
    <button class="mt-input__end" type="button" aria-label="Clear">×</button>
  </div>
  <div class="mt-field__error" role="alert">Invalid email format</div>
</div>

## Key Value Pair
<section class="mt-kvp" aria-label="Key value pair list">
  <div class="mt-kvp__row">
    <div class="mt-kvp__key">Label</div>
    <div class="mt-kvp__value">
      <div class="mt-kvp__text-title">Key</div>
      <div class="mt-kvp__text-sub">Value</div>
    </div>
  </div>
</section>

## Paragraph
<section class="mt-paragraph">
  <h2 class="mt-paragraph__headline">Headline example</h2>
  <p class="mt-paragraph__desc">Description example…</p>
  <h3 class="mt-paragraph__subhead">Subheadline here</h3>
  <p class="mt-paragraph__body">Lorem ipsum…</p>
  <p class="mt-paragraph__meta">Description example…</p>
</section>

## Picker
<div class="mt-field">
  <label class="mt-field__label" for="pk1">Picker</label>
  <div class="mt-picker" data-open="true">
    <div class="mt-input">
      <input id="pk1" class="mt-input__control" placeholder="Search..." aria-expanded="true" aria-haspopup="listbox" />
    </div>
    <div class="mt-picker__panel" role="listbox">
      <button class="mt-picker__option" role="option">
        <span class="mt-picker__option-label">Item name</span>
      </button>
    </div>
  </div>
</div>

## Date Picker
<div class="mt-picker mt-date" data-open="true">
  <div class="mt-input"><input class="mt-input__control" placeholder="Select date" /></div>
  <div class="mt-picker__panel">
    <div class="mt-date__header">
      <button class="mt-date__nav">‹</button>
      <div class="mt-date__month">Jan 2021</div>
      <button class="mt-date__nav">›</button>
    </div>
    <div class="mt-date__grid">
      <button class="mt-date__cell">1</button>
      <button class="mt-date__cell" data-selected="true">15</button>
    </div>
  </div>
</div>

## Time Picker
<div class="mt-picker mt-time" data-open="true">
  <div class="mt-input"><input class="mt-input__control" placeholder="Enter time" /></div>
  <div class="mt-picker__panel">
    <div class="mt-time__row">
      <input class="mt-time__input" value="1:00 PM" />
      <button class="mt-btn" data-style="accent" data-size="sm">Now</button>
    </div>
  </div>
</div>

## Pivot
<nav class="mt-pivot" aria-label="Pivot">
  <div class="mt-pivot__list" role="tablist">
    <button class="mt-pivot__tab" role="tab" aria-selected="true">Active tab</button>
    <button class="mt-pivot__tab" role="tab" aria-selected="false">Unselected tab</button>
    <button class="mt-pivot__tab" role="tab" aria-selected="false">Unselected tab</button>
  </div>
</nav>

## Progress Indicator
<div class="mt-progress" data-variant="indeterminate" aria-label="Loading">
  <span class="mt-progress__spinner" aria-hidden="true"></span>
</div>
<div class="mt-progress" data-variant="determinate" aria-label="Progress">
  <div class="mt-progress__text">
    <div class="mt-progress__label">Label</div>
    <div class="mt-progress__desc">Description</div>
  </div>
  <div class="mt-progress__bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="35">
    <div class="mt-progress__fill" style="width:35%"></div>
  </div>
</div>

## Radio
<div class="mt-radio-group" role="radiogroup" aria-label="Options">
  <label class="mt-radio">
    <input class="mt-radio__input" type="radio" name="r1" />
    <span class="mt-radio__control" aria-hidden="true"></span>
    <span class="mt-radio__label">Unselected</span>
  </label>
  <label class="mt-radio">
    <input class="mt-radio__input" type="radio" name="r1" checked />
    <span class="mt-radio__control" aria-hidden="true"></span>
    <span class="mt-radio__label">Selected</span>
  </label>
</div>

## Scroll Region
<div class="mt-scroll" tabindex="0">Very long content…</div>

## Search Box
<div class="mt-search" role="search">
  <div class="mt-search__box">
    <span class="mt-search__icon" aria-hidden="true"></span>
    <input class="mt-search__input" type="search" placeholder="Search" aria-label="Search" />
    <button class="mt-search__clear" type="button" aria-label="Clear" hidden>×</button>
  </div>
</div>

## Side Panel
<div class="mt-sidepanel" data-open="true" role="dialog" aria-modal="true" aria-labelledby="sp-title">
  <div class="mt-sidepanel__scrim"></div>
  <aside class="mt-sidepanel__panel" data-size="md">
    <header class="mt-sidepanel__header">
      <h2 id="sp-title" class="mt-sidepanel__title">Panel title</h2>
      <button class="mt-sidepanel__close" aria-label="Close">×</button>
    </header>
    <div class="mt-sidepanel__body">…</div>
    <footer class="mt-sidepanel__footer">
      <button class="mt-btn" data-style="neutral">Cancel</button>
      <button class="mt-btn" data-style="accent">Save</button>
    </footer>
  </aside>
</div>

## Status Label
<span class="mt-status" data-variant="critical">
  <span class="mt-status__icon" aria-hidden="true">!</span>
  <span class="mt-status__text">Critical</span>
</span>
<span class="mt-status" data-variant="warning">
  <span class="mt-status__icon" aria-hidden="true">!</span>
  <span class="mt-status__text">Warning</span>
</span>

## Toast
<div class="mt-toast-stack" aria-live="polite">
  <div class="mt-toast" data-variant="default">
    <div class="mt-toast__header">
      <span class="mt-toast__avatar"></span>
      <div class="mt-toast__meta">
        <div class="mt-toast__title">ContosoBot</div>
        <div class="mt-toast__subtitle">Lorem ipsum…</div>
      </div>
      <button class="mt-toast__close" aria-label="Close">×</button>
    </div>
    <div class="mt-toast__body">
      <div class="mt-toast__message">Lorem ipsum…</div>
    </div>
    <div class="mt-toast__reply">
      <input class="mt-toast__input" placeholder="Send a quick reply..." />
      <button class="mt-toast__send">➤</button>
    </div>
  </div>
</div>

## Toggle
<label class="mt-toggle">
  <input class="mt-toggle__input" type="checkbox" />
  <span class="mt-toggle__track" aria-hidden="true"><span class="mt-toggle__thumb"></span></span>
  <span class="mt-toggle__label">Label</span>
</label>

## Tooltip
<button class="mt-btn" data-style="neutral" aria-describedby="tt1">Hover me</button>
<div id="tt1" class="mt-tooltip" role="tooltip" data-placement="top" data-open="true">Tooltip</div>
`;