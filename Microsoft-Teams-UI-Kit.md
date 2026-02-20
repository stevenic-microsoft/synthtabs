\## Commit: Component Inventory + Full Light/Dark Themes (up through Tooltip)



Below is the consolidated \*\*component inventory (HTML)\*\* plus the \*\*single token-based CSS system\*\* and \*\*complete Light/Dark theme blocks\*\* that cover everything added so far: Buttons, Alert, Breadcrumb, Card, Carousel, Checkbox, Coachmark, Menu, Dialog, Dropdown, Group list, Link, \*\*Input\*\*, \*\*Key value pair\*\*, \*\*Paragraph\*\*, \*\*Picker\*\*, \*\*Pivot\*\*, \*\*Progress indicator\*\*, \*\*Radio (final)\*\*, \*\*Scrollbar\*\*, \*\*Search box\*\*, \*\*Side panel\*\*, \*\*Status label\*\*, \*\*Toast\*\*, \*\*Toggle (final)\*\*, \*\*Tooltip\*\*.



---



\# Component inventory (HTML)



\## Button



```html

<button class="mt-btn" data-style="accent" data-size="md">Button</button>

<button class="mt-btn" data-style="neutral" data-size="sm">Button</button>

<button class="mt-btn" data-style="outline" data-size="md">Button</button>

<button class="mt-btn" data-style="ghost" data-size="md">Button</button>



<button class="mt-btn" data-style="accent" data-icon-only aria-label="Icon button">

&nbsp; <svg class="mt-btn\_\_icon" aria-hidden="true">...</svg>

</button>



<div class="mt-btn-group">

&nbsp; <button class="mt-btn" data-style="accent">Button</button>

&nbsp; <button class="mt-btn mt-btn--split" data-style="accent" aria-label="More">▾</button>

</div>

```



\## Alert



```html

<div class="mt-alert" data-variant="error" role="status">

&nbsp; <span class="mt-alert\_\_icon" aria-hidden="true"></span>

&nbsp; <span class="mt-alert\_\_message">Message goes here</span>

&nbsp; <button class="mt-alert\_\_action" type="button">Action</button>

&nbsp; <button class="mt-alert\_\_dismiss" type="button" aria-label="Dismiss">×</button>

</div>

```



\## Breadcrumb



```html

<nav class="mt-breadcrumb" aria-label="Breadcrumb">

&nbsp; <ol class="mt-breadcrumb\_\_list">

&nbsp;   <li><a class="mt-link" href="#">Folder</a></li>

&nbsp;   <li class="mt-breadcrumb\_\_sep" aria-hidden="true">›</li>

&nbsp;   <li><a class="mt-link" href="#">Folder</a></li>

&nbsp;   <li class="mt-breadcrumb\_\_sep" aria-hidden="true">›</li>

&nbsp;   <li aria-current="page"><span class="mt-breadcrumb\_\_current">Folder</span></li>

&nbsp; </ol>

</nav>

```



\## Card



```html

<article class="mt-card" data-size="md" tabindex="0">

&nbsp; <div class="mt-card\_\_media"><img src="..." alt="" /></div>

&nbsp; <div class="mt-card\_\_body">

&nbsp;   <div class="mt-card\_\_header">

&nbsp;     <div class="mt-card\_\_text">

&nbsp;       <div class="mt-card\_\_title">Fluent base card</div>

&nbsp;       <div class="mt-card\_\_subtitle">Subtitle</div>

&nbsp;     </div>

&nbsp;     <button class="mt-card\_\_menu" aria-label="More">⋯</button>

&nbsp;   </div>

&nbsp; </div>

</article>

```



\## Carousel



```html

<section class="mt-carousel" aria-roledescription="carousel">

&nbsp; <div class="mt-carousel\_\_viewport">

&nbsp;   <div class="mt-carousel\_\_track" style="transform:translateX(0);">

&nbsp;     <div class="mt-carousel\_\_slide"><div class="mt-carousel\_\_content">CONTENT</div></div>

&nbsp;   </div>

&nbsp;   <button class="mt-carousel\_\_nav mt-carousel\_\_nav--prev" aria-label="Previous">‹</button>

&nbsp;   <button class="mt-carousel\_\_nav mt-carousel\_\_nav--next" aria-label="Next">›</button>

&nbsp; </div>

&nbsp; <div class="mt-carousel\_\_dots">

&nbsp;   <button class="mt-carousel\_\_dot" aria-selected="true"></button>

&nbsp;   <button class="mt-carousel\_\_dot"></button>

&nbsp; </div>

</section>

```



\## Checkbox



```html

<label class="mt-checkbox">

&nbsp; <input class="mt-checkbox\_\_input" type="checkbox" />

&nbsp; <span class="mt-checkbox\_\_control" aria-hidden="true">

&nbsp;   <svg class="mt-checkbox\_\_icon" viewBox="0 0 16 16"><path d="M4 8.5l2.5 2.5L12 5.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>

&nbsp; </span>

&nbsp; <span class="mt-checkbox\_\_label">Label</span>

</label>

```



\## Coachmark



```html

<div class="mt-coachmark" role="dialog" aria-modal="true" aria-labelledby="cm-title">

&nbsp; <div class="mt-coachmark\_\_scrim"></div>

&nbsp; <div class="mt-coachmark\_\_panel" data-placement="bottom">

&nbsp;   <button class="mt-coachmark\_\_close" aria-label="Close">×</button>

&nbsp;   <h3 id="cm-title" class="mt-coachmark\_\_title">Not sure where to start?</h3>

&nbsp;   <div class="mt-coachmark\_\_body">…</div>

&nbsp;   <div class="mt-coachmark\_\_footer">

&nbsp;     <button class="mt-btn" data-style="neutral">Show me how</button>

&nbsp;     <button class="mt-btn" data-style="ghost">Close</button>

&nbsp;   </div>

&nbsp; </div>

</div>

```



\## Contextual menu (Menu)



```html

<div class="mt-menu" role="menu" aria-label="Context menu">

&nbsp; <button class="mt-menu\_\_item" role="menuitem">

&nbsp;   <span class="mt-menu\_\_icon" aria-hidden="true">⚡</span>

&nbsp;   <span class="mt-menu\_\_label">Action</span>

&nbsp;   <span class="mt-menu\_\_shortcut" aria-hidden="true">Ctrl+S</span>

&nbsp; </button>

&nbsp; <div class="mt-menu\_\_divider" role="separator"></div>

&nbsp; <div class="mt-menu\_\_section" aria-hidden="true">Section</div>

&nbsp; <button class="mt-menu\_\_item" role="menuitem" aria-haspopup="menu">

&nbsp;   <span class="mt-menu\_\_label">Action</span>

&nbsp;   <span class="mt-menu\_\_submenu" aria-hidden="true">›</span>

&nbsp; </button>

</div>

```



\## Dialog



```html

<div class="mt-dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-title">

&nbsp; <div class="mt-dialog\_\_scrim"></div>

&nbsp; <div class="mt-dialog\_\_panel" data-size="md">

&nbsp;   <header class="mt-dialog\_\_header"><h2 id="dlg-title" class="mt-dialog\_\_title">Dialog title</h2></header>

&nbsp;   <div class="mt-dialog\_\_body">…</div>

&nbsp;   <div class="mt-dialog\_\_error" role="alert">Error</div>

&nbsp;   <footer class="mt-dialog\_\_footer">

&nbsp;     <button class="mt-btn" data-style="neutral">Secondary</button>

&nbsp;     <button class="mt-btn" data-style="accent">Primary</button>

&nbsp;   </footer>

&nbsp; </div>

</div>

```



\## Dropdown (button + menu)



```html

<div class="mt-field" data-state="default">

&nbsp; <label class="mt-field\_\_label" for="dd1">Label</label>

&nbsp; <button id="dd1" class="mt-dropdown" aria-haspopup="listbox" aria-expanded="false">

&nbsp;   <span class="mt-dropdown\_\_value">Select</span>

&nbsp;   <span class="mt-dropdown\_\_icon" aria-hidden="true">▾</span>

&nbsp; </button>

&nbsp; <div class="mt-field\_\_error" role="alert">Error</div>

</div>

<!-- when open, render a .mt-menu below (role=listbox / option) -->

```



\## Group list (disclosure header)



```html

<div class="mt-group">

&nbsp; <button class="mt-group\_\_header" aria-expanded="false" aria-controls="grp1">

&nbsp;   <span class="mt-group\_\_chevron" aria-hidden="true">▸</span>

&nbsp;   <span class="mt-group\_\_label">Label</span>

&nbsp; </button>

&nbsp; <div id="grp1" class="mt-group\_\_content" hidden>…</div>

</div>

```



\## Hyperlink



```html

<a class="mt-link" href="#">Hyperlink</a>

<a class="mt-link mt-link--truncate" href="#">A very long hyperlink that should truncate</a>

<a class="mt-link" aria-disabled="true" tabindex="-1">Disabled</a>

```



---



\## Input



```html

<div class="mt-field" data-state="default">

&nbsp; <label class="mt-field\_\_label" for="in1">Label</label>



&nbsp; <div class="mt-input" data-size="md">

&nbsp;   <input id="in1" class="mt-input\_\_control" type="text" placeholder="Placeholder text" />

&nbsp; </div>



&nbsp; <div class="mt-field\_\_hint">Optional hint</div>

</div>



<div class="mt-field" data-state="default">

&nbsp; <div class="mt-input" data-size="md">

&nbsp;   <span class="mt-input\_\_prefix mt-input\_\_prefix--chip">Prefix</span>

&nbsp;   <input class="mt-input\_\_control" type="text" placeholder="Placeholder" />

&nbsp; </div>

</div>



<div class="mt-field" data-state="error">

&nbsp; <label class="mt-field\_\_label" for="in3">Email</label>

&nbsp; <div class="mt-input" data-size="md">

&nbsp;   <input id="in3" class="mt-input\_\_control" type="email" value="leorejsejcm" />

&nbsp;   <button class="mt-input\_\_end" type="button" aria-label="Clear">×</button>

&nbsp; </div>

&nbsp; <div class="mt-field\_\_error" role="alert">Invalid email format</div>

</div>

```



\## Key value pair



```html

<section class="mt-kvp" aria-label="Key value pair list">

&nbsp; <div class="mt-kvp\_\_row">

&nbsp;   <div class="mt-kvp\_\_key">Label</div>

&nbsp;   <div class="mt-kvp\_\_value">

&nbsp;     <div class="mt-kvp\_\_text-title">Key</div>

&nbsp;     <div class="mt-kvp\_\_text-sub">Value</div>

&nbsp;   </div>

&nbsp; </div>



&nbsp; <div class="mt-kvp\_\_row">

&nbsp;   <div class="mt-kvp\_\_key">Toggle switch</div>

&nbsp;   <div class="mt-kvp\_\_value">

&nbsp;     <div class="mt-kvp\_\_text-title">Key</div>

&nbsp;     <label class="mt-toggle">

&nbsp;       <input class="mt-toggle\_\_input" type="checkbox" />

&nbsp;       <span class="mt-toggle\_\_track" aria-hidden="true"><span class="mt-toggle\_\_thumb"></span></span>

&nbsp;     </label>

&nbsp;   </div>

&nbsp; </div>



&nbsp; <div class="mt-kvp\_\_row">

&nbsp;   <div class="mt-kvp\_\_key">Input box</div>

&nbsp;   <div class="mt-kvp\_\_value">

&nbsp;     <div class="mt-kvp\_\_text-title">Key</div>

&nbsp;     <div class="mt-input"><input class="mt-input\_\_control" placeholder="Placeholder text" /></div>

&nbsp;   </div>

&nbsp; </div>



&nbsp; <div class="mt-kvp\_\_row">

&nbsp;   <div class="mt-kvp\_\_key">Radios</div>

&nbsp;   <div class="mt-kvp\_\_value">

&nbsp;     <div class="mt-kvp\_\_text-title">Key</div>

&nbsp;     <div class="mt-radio-group" role="radiogroup" aria-label="Key">

&nbsp;       <label class="mt-radio">

&nbsp;         <input class="mt-radio\_\_input" type="radio" name="r1" />

&nbsp;         <span class="mt-radio\_\_control" aria-hidden="true"></span>

&nbsp;         <span class="mt-radio\_\_label">Unselected</span>

&nbsp;       </label>

&nbsp;       <label class="mt-radio">

&nbsp;         <input class="mt-radio\_\_input" type="radio" name="r1" checked />

&nbsp;         <span class="mt-radio\_\_control" aria-hidden="true"></span>

&nbsp;         <span class="mt-radio\_\_label">Selected</span>

&nbsp;       </label>

&nbsp;     </div>

&nbsp;   </div>

&nbsp; </div>

</section>

```



\## Paragraph



```html

<section class="mt-paragraph">

&nbsp; <h2 class="mt-paragraph\_\_headline">Headline example</h2>

&nbsp; <p class="mt-paragraph\_\_desc">Description example…</p>

&nbsp; <h3 class="mt-paragraph\_\_subhead">Subheadline here</h3>

&nbsp; <p class="mt-paragraph\_\_body">Lorem ipsum…</p>

&nbsp; <p class="mt-paragraph\_\_meta">Description example…</p>

</section>

```



\## Picker (generic + date/time)



```html

<div class="mt-field">

&nbsp; <label class="mt-field\_\_label" for="pk1">Picker</label>



&nbsp; <div class="mt-picker" data-open="true">

&nbsp;   <div class="mt-input">

&nbsp;     <input id="pk1" class="mt-input\_\_control" placeholder="Search..." aria-expanded="true" aria-haspopup="listbox" />

&nbsp;   </div>



&nbsp;   <div class="mt-picker\_\_panel" role="listbox">

&nbsp;     <button class="mt-picker\_\_option" role="option">

&nbsp;       <span class="mt-picker\_\_option-label">Item name</span>

&nbsp;     </button>

&nbsp;   </div>

&nbsp; </div>

</div>



<div class="mt-picker mt-date" data-open="true">

&nbsp; <div class="mt-input"><input class="mt-input\_\_control" placeholder="Select date" /></div>

&nbsp; <div class="mt-picker\_\_panel">

&nbsp;   <div class="mt-date\_\_header">

&nbsp;     <button class="mt-date\_\_nav">‹</button>

&nbsp;     <div class="mt-date\_\_month">Jan 2021</div>

&nbsp;     <button class="mt-date\_\_nav">›</button>

&nbsp;   </div>

&nbsp;   <div class="mt-date\_\_grid">

&nbsp;     <button class="mt-date\_\_cell">1</button>

&nbsp;     <button class="mt-date\_\_cell" data-selected="true">15</button>

&nbsp;   </div>

&nbsp; </div>

</div>



<div class="mt-picker mt-time" data-open="true">

&nbsp; <div class="mt-input"><input class="mt-input\_\_control" placeholder="Enter time" /></div>

&nbsp; <div class="mt-picker\_\_panel">

&nbsp;   <div class="mt-time\_\_row">

&nbsp;     <input class="mt-time\_\_input" value="1:00 PM" />

&nbsp;     <button class="mt-btn" data-style="accent" data-size="sm">Now</button>

&nbsp;   </div>

&nbsp; </div>

</div>

```



\## Pivot



```html

<nav class="mt-pivot" aria-label="Pivot">

&nbsp; <div class="mt-pivot\_\_list" role="tablist">

&nbsp;   <button class="mt-pivot\_\_tab" role="tab" aria-selected="true">Active tab</button>

&nbsp;   <button class="mt-pivot\_\_tab" role="tab" aria-selected="false">Unselected tab</button>

&nbsp;   <button class="mt-pivot\_\_tab" role="tab" aria-selected="false">Unselected tab</button>

&nbsp; </div>

</nav>

```



\## Progress indicator



```html

<div class="mt-progress" data-variant="indeterminate" aria-label="Loading">

&nbsp; <span class="mt-progress\_\_spinner" aria-hidden="true"></span>

</div>



<div class="mt-progress" data-variant="determinate" aria-label="Progress">

&nbsp; <div class="mt-progress\_\_text">

&nbsp;   <div class="mt-progress\_\_label">Label</div>

&nbsp;   <div class="mt-progress\_\_desc">Description</div>

&nbsp; </div>

&nbsp; <div class="mt-progress\_\_bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="35">

&nbsp;   <div class="mt-progress\_\_fill" style="width:35%"></div>

&nbsp; </div>

</div>

```



\## Radio (final)



```html

<div class="mt-radio-group" role="radiogroup" aria-label="Options">

&nbsp; <label class="mt-radio">

&nbsp;   <input class="mt-radio\_\_input" type="radio" name="r1" />

&nbsp;   <span class="mt-radio\_\_control" aria-hidden="true"></span>

&nbsp;   <span class="mt-radio\_\_label">Unselected</span>

&nbsp; </label>

&nbsp; <label class="mt-radio">

&nbsp;   <input class="mt-radio\_\_input" type="radio" name="r1" checked />

&nbsp;   <span class="mt-radio\_\_control" aria-hidden="true"></span>

&nbsp;   <span class="mt-radio\_\_label">Selected</span>

&nbsp; </label>

</div>

```



\## Scroll region (styled scrollbars)



```html

<div class="mt-scroll" tabindex="0">Very long content…</div>

```



\## Search box



```html

<div class="mt-search" role="search">

&nbsp; <div class="mt-search\_\_box">

&nbsp;   <span class="mt-search\_\_icon" aria-hidden="true"></span>

&nbsp;   <input class="mt-search\_\_input" type="search" placeholder="Search" aria-label="Search" />

&nbsp;   <button class="mt-search\_\_clear" type="button" aria-label="Clear" hidden>×</button>

&nbsp; </div>

</div>

```



\## Side panel



```html

<div class="mt-sidepanel" data-open="true" role="dialog" aria-modal="true" aria-labelledby="sp-title">

&nbsp; <div class="mt-sidepanel\_\_scrim"></div>

&nbsp; <aside class="mt-sidepanel\_\_panel" data-size="md">

&nbsp;   <header class="mt-sidepanel\_\_header">

&nbsp;     <h2 id="sp-title" class="mt-sidepanel\_\_title">Panel title</h2>

&nbsp;     <button class="mt-sidepanel\_\_close" aria-label="Close">×</button>

&nbsp;   </header>

&nbsp;   <div class="mt-sidepanel\_\_body">…</div>

&nbsp;   <footer class="mt-sidepanel\_\_footer">

&nbsp;     <button class="mt-btn" data-style="neutral">Cancel</button>

&nbsp;     <button class="mt-btn" data-style="accent">Save</button>

&nbsp;   </footer>

&nbsp; </aside>

</div>

```



\## Status label



```html

<span class="mt-status" data-variant="critical">

&nbsp; <span class="mt-status\_\_icon" aria-hidden="true">!</span>

&nbsp; <span class="mt-status\_\_text">Critical</span>

</span>



<span class="mt-status" data-variant="warning">

&nbsp; <span class="mt-status\_\_icon" aria-hidden="true">!</span>

&nbsp; <span class="mt-status\_\_text">Warning</span>

</span>

```



\## Toast



```html

<div class="mt-toast-stack" aria-live="polite">

&nbsp; <div class="mt-toast" data-variant="default">

&nbsp;   <div class="mt-toast\_\_header">

&nbsp;     <span class="mt-toast\_\_avatar"></span>

&nbsp;     <div class="mt-toast\_\_meta">

&nbsp;       <div class="mt-toast\_\_title">ContosoBot</div>

&nbsp;       <div class="mt-toast\_\_subtitle">Lorem ipsum…</div>

&nbsp;     </div>

&nbsp;     <button class="mt-toast\_\_close" aria-label="Close">×</button>

&nbsp;   </div>

&nbsp;   <div class="mt-toast\_\_body">

&nbsp;     <div class="mt-toast\_\_message">Lorem ipsum…</div>

&nbsp;   </div>

&nbsp;   <div class="mt-toast\_\_reply">

&nbsp;     <input class="mt-toast\_\_input" placeholder="Send a quick reply..." />

&nbsp;     <button class="mt-toast\_\_send">➤</button>

&nbsp;   </div>

&nbsp; </div>

</div>

```



\## Toggle (final)



```html

<label class="mt-toggle">

&nbsp; <input class="mt-toggle\_\_input" type="checkbox" />

&nbsp; <span class="mt-toggle\_\_track" aria-hidden="true"><span class="mt-toggle\_\_thumb"></span></span>

&nbsp; <span class="mt-toggle\_\_label">Label</span>

</label>

```



\## Tooltip



```html

<button class="mt-btn" data-style="neutral" aria-describedby="tt1">Hover me</button>

<div id="tt1" class="mt-tooltip" role="tooltip" data-placement="top" data-open="true">Tooltip</div>

```



---



\# Single stylesheet (Base tokens + component CSS)



```css

/\* ===== Base Tokens (theme sets values) ===== \*/

:root{

&nbsp; --font:"Segoe UI",system-ui,-apple-system,sans-serif;

&nbsp; --type-xs: 12px/16px var(--font);

&nbsp; --type-sm: 13px/20px var(--font);

&nbsp; --type-md: 16px/22px var(--font);

&nbsp; --type-lg: 18px/24px var(--font);



&nbsp; --bg: ;

&nbsp; --surface: ;

&nbsp; --surface-2: ;

&nbsp; --surface-hover: ;

&nbsp; --surface-pressed: ;

&nbsp; --surface-disabled: ;



&nbsp; --text: ;

&nbsp; --text-muted: ;

&nbsp; --text-disabled: ;



&nbsp; --border: ;

&nbsp; --border-strong: ;



&nbsp; --accent: ;

&nbsp; --accent-hover: ;

&nbsp; --accent-pressed: ;

&nbsp; --accent-contrast: ;



&nbsp; --danger: ;

&nbsp; --danger-2: ;



&nbsp; --focus-ring: ;



&nbsp; --shadow-1: ;

&nbsp; --shadow-2: ;



&nbsp; --scrim: ;

}



/\* ===== Primitives ===== \*/

.mt-link{ color:var(--accent); text-decoration:none; cursor:pointer; font:inherit; }

.mt-link:hover{ color:var(--accent-hover); text-decoration:underline; }

.mt-link:focus-visible{ outline:2px solid var(--focus-ring); outline-offset:2px; border-radius:2px; }

.mt-link\[aria-disabled="true"]{ color:var(--text-disabled); pointer-events:none; cursor:default; text-decoration:none; }

.mt-link--truncate{ display:inline-block; max-width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }



/\* ===== Button ===== \*/

.mt-btn{

&nbsp; display:inline-flex; align-items:center; justify-content:center; gap:6px;

&nbsp; border-radius:4px; border:1px solid var(--btn-border);

&nbsp; background:var(--btn-bg); color:var(--btn-fg);

&nbsp; font:600 var(--type-sm);

&nbsp; height:32px; padding:0 12px;

&nbsp; cursor:pointer; user-select:none;

}

.mt-btn\[data-size="sm"]{ height:24px; padding:0 8px; font:600 var(--type-xs); }

.mt-btn:hover:not(:disabled){ background:var(--btn-hover-bg); }

.mt-btn:active:not(:disabled){ background:var(--btn-pressed-bg); }

.mt-btn:focus-visible{ outline:2px solid var(--focus-ring); outline-offset:2px; }

.mt-btn:disabled{ background:var(--surface-disabled); color:var(--text-disabled); border-color:var(--surface-disabled); cursor:not-allowed; }

.mt-btn\[data-icon-only]{ width:32px; padding:0; }

.mt-btn\[data-icon-only]\[data-size="sm"]{ width:24px; }

.mt-btn-group{ display:inline-flex; }

.mt-btn--split{ width:32px; padding:0; }



.mt-btn\[data-style="accent"]{

&nbsp; --btn-bg:var(--accent); --btn-fg:var(--accent-contrast); --btn-border:var(--accent);

&nbsp; --btn-hover-bg:var(--accent-hover); --btn-pressed-bg:var(--accent-pressed);

}

.mt-btn\[data-style="neutral"]{

&nbsp; --btn-bg:var(--surface); --btn-fg:var(--text); --btn-border:var(--border);

&nbsp; --btn-hover-bg:var(--surface-hover); --btn-pressed-bg:var(--surface-pressed);

}

.mt-btn\[data-style="outline"]{

&nbsp; --btn-bg:transparent; --btn-fg:var(--text); --btn-border:var(--border-strong);

&nbsp; --btn-hover-bg:var(--surface-hover); --btn-pressed-bg:var(--surface-pressed);

}

.mt-btn\[data-style="ghost"]{

&nbsp; --btn-bg:transparent; --btn-fg:var(--text); --btn-border:transparent;

&nbsp; --btn-hover-bg:var(--surface-hover); --btn-pressed-bg:var(--surface-pressed);

}



/\* ===== Alert ===== \*/

.mt-alert{

&nbsp; display:flex; align-items:center; gap:10px;

&nbsp; min-height:32px; padding:6px 10px;

&nbsp; border:1px solid var(--alert-border);

&nbsp; border-radius:4px;

&nbsp; background:var(--alert-bg);

&nbsp; color:var(--alert-fg);

}

.mt-alert\_\_icon{ width:14px; height:14px; border-radius:999px; background:var(--alert-icon); }

.mt-alert\_\_message{ font:var(--type-xs); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; }

.mt-alert\_\_action{

&nbsp; height:22px; padding:0 10px; border-radius:3px;

&nbsp; border:1px solid var(--border); background:var(--surface); color:var(--text);

&nbsp; font:600 11px/20px var(--font);

}

.mt-alert\_\_dismiss{

&nbsp; width:22px; height:22px; display:grid; place-items:center;

&nbsp; border:0; background:transparent; color:var(--text-muted); border-radius:3px;

}

.mt-alert\_\_action:focus-visible,.mt-alert\_\_dismiss:focus-visible{ outline:2px solid var(--focus-ring); outline-offset:2px; }



.mt-alert\[data-variant="error"]  { --alert-bg:var(--alert-error-bg);  --alert-border:var(--alert-error-border);  --alert-fg:var(--alert-error-fg);  --alert-icon:var(--alert-error-icon); }

.mt-alert\[data-variant="warning"]{ --alert-bg:var(--alert-warn-bg);   --alert-border:var(--alert-warn-border);   --alert-fg:var(--alert-warn-fg);   --alert-icon:var(--alert-warn-icon); }

.mt-alert\[data-variant="success"]{ --alert-bg:var(--alert-ok-bg);     --alert-border:var(--alert-ok-border);     --alert-fg:var(--alert-ok-fg);     --alert-icon:var(--alert-ok-icon); }

.mt-alert\[data-variant="info"]   { --alert-bg:var(--alert-info-bg);   --alert-border:var(--alert-info-border);   --alert-fg:var(--alert-info-fg);   --alert-icon:var(--alert-info-icon); }



/\* ===== Breadcrumb ===== \*/

.mt-breadcrumb{ font:var(--type-sm); }

.mt-breadcrumb\_\_list{ display:flex; align-items:center; gap:6px; list-style:none; margin:0; padding:0; }

.mt-breadcrumb\_\_sep{ color:var(--text-disabled); user-select:none; }

.mt-breadcrumb\_\_current{ color:var(--text); font-weight:600; }



/\* ===== Card ===== \*/

.mt-card{

&nbsp; position:relative; display:flex; flex-direction:column; overflow:hidden;

&nbsp; border-radius:6px; border:1px solid var(--border);

&nbsp; background:var(--surface); color:var(--text);

&nbsp; box-shadow:var(--shadow-1);

}

.mt-card:hover{ box-shadow:var(--shadow-2); }

.mt-card:focus-visible{ outline:2px solid var(--focus-ring); outline-offset:2px; }

.mt-card\[data-size="xs"]{ width:160px; } .mt-card\[data-size="sm"]{ width:220px; }

.mt-card\[data-size="md"]{ width:280px; } .mt-card\[data-size="lg"]{ width:360px; }

.mt-card\_\_media{ aspect-ratio:16/9; background:var(--surface-2); }

.mt-card\_\_media img{ width:100%; height:100%; object-fit:cover; display:block; }

.mt-card\_\_body{ padding:10px 12px; }

.mt-card\_\_header{ display:flex; gap:8px; align-items:flex-start; }

.mt-card\_\_title{ font:600 var(--type-sm); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

.mt-card\_\_subtitle{ font:var(--type-xs); color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

.mt-card\_\_menu{ width:28px; height:28px; border:0; background:transparent; color:var(--text-muted); border-radius:4px; cursor:pointer; }

.mt-card\_\_menu:hover{ background:var(--surface-hover); color:var(--text); }

.mt-card\_\_menu:focus-visible{ outline:2px solid var(--focus-ring); outline-offset:2px; }

.mt-card\[data-selected="true"]{ border-color:var(--accent); }

.mt-card\[data-selected="true"]::after{

&nbsp; content:"✓"; position:absolute; top:8px; right:8px;

&nbsp; width:18px; height:18px; border-radius:999px; display:grid; place-items:center;

&nbsp; background:var(--accent); color:var(--accent-contrast); font:700 12px/1 var(--font);

}

.mt-card\[data-disabled="true"]{ background:var(--surface-disabled); color:var(--text-disabled); box-shadow:none; opacity:.7; pointer-events:none; }



/\* ===== Carousel ===== \*/

.mt-carousel\_\_viewport{ position:relative; overflow:hidden; display:flex; justify-content:center; align-items:center; }

.mt-carousel\_\_track{ display:flex; transition:transform 240ms ease; }

.mt-carousel\_\_slide{ min-width:100%; display:flex; justify-content:center; padding:20px 0; }

.mt-carousel\_\_content{

&nbsp; width:70%; max-width:600px; aspect-ratio:16/9;

&nbsp; border-radius:6px; border:1px solid var(--border);

&nbsp; background:var(--surface); box-shadow:var(--shadow-1);

&nbsp; display:grid; place-items:center;

}

.mt-carousel\_\_nav{

&nbsp; position:absolute; top:50%; transform:translateY(-50%);

&nbsp; width:36px; height:36px; border-radius:999px; border:0;

&nbsp; background:transparent; color:var(--text-muted); cursor:pointer;

}

.mt-carousel\_\_nav--prev{ left:12px; } .mt-carousel\_\_nav--next{ right:12px; }

.mt-carousel\_\_nav:hover{ background:var(--surface-hover); color:var(--text); }

.mt-carousel\_\_nav:focus-visible{ outline:2px solid var(--focus-ring); outline-offset:2px; }

.mt-carousel\_\_dots{ display:flex; justify-content:center; gap:6px; margin-top:8px; }

.mt-carousel\_\_dot{ width:6px; height:6px; border-radius:999px; border:0; background:var(--text-disabled); cursor:pointer; }

.mt-carousel\_\_dot\[aria-selected="true"]{ background:var(--accent); transform:scale(1.2); }

.mt-carousel\_\_dot:focus-visible{ outline:2px solid var(--focus-ring); outline-offset:2px; }



/\* ===== Checkbox ===== \*/

.mt-checkbox{ display:inline-flex; align-items:center; gap:8px; cursor:pointer; font:var(--type-sm); color:var(--text); }

.mt-checkbox\_\_input{ position:absolute; opacity:0; pointer-events:none; }

.mt-checkbox\_\_control{

&nbsp; width:16px; height:16px; display:grid; place-items:center;

&nbsp; border-radius:3px; border:1px solid var(--border-strong); background:transparent;

}

.mt-checkbox\_\_icon{ width:12px; height:12px; color:var(--accent-contrast); opacity:0; transform:scale(.85); transition:120ms ease; }

.mt-checkbox:hover .mt-checkbox\_\_control{ border-color:var(--text); }

.mt-checkbox\_\_input:checked + .mt-checkbox\_\_control{ background:var(--accent); border-color:var(--accent); }

.mt-checkbox\_\_input:checked + .mt-checkbox\_\_control .mt-checkbox\_\_icon{ opacity:1; transform:scale(1); }

.mt-checkbox\_\_input:focus-visible + .mt-checkbox\_\_control{ outline:2px solid var(--focus-ring); outline-offset:2px; }

.mt-checkbox\_\_input:disabled + .mt-checkbox\_\_control{ background:var(--surface-disabled); border-color:var(--border); }

.mt-checkbox\_\_input:disabled ~ .mt-checkbox\_\_label{ color:var(--text-disabled); cursor:not-allowed; }



/\* ===== Menu ===== \*/

.mt-menu{

&nbsp; min-width:180px; max-width:280px; padding:4px;

&nbsp; border-radius:6px; border:1px solid var(--menu-border);

&nbsp; background:var(--menu-bg); box-shadow:var(--menu-shadow);

}

.mt-menu\_\_item{

&nbsp; width:100%; height:32px;

&nbsp; display:grid; grid-template-columns:20px 1fr auto auto; align-items:center; gap:8px;

&nbsp; padding:0 8px; border:0; border-radius:4px; background:transparent;

&nbsp; color:var(--text); font:var(--type-sm); text-align:left; cursor:pointer;

}

.mt-menu\_\_icon{ color:var(--text-muted); }

.mt-menu\_\_shortcut,.mt-menu\_\_submenu{ color:var(--text-muted); font:var(--type-xs); }

.mt-menu\_\_item:hover{ background:var(--surface-hover); }

.mt-menu\_\_item:active{ background:var(--surface-pressed); }

.mt-menu\_\_item:focus-visible{ outline:2px solid var(--focus-ring); outline-offset:2px; }

.mt-menu\_\_divider{ height:1px; background:var(--border); margin:4px 6px; }

.mt-menu\_\_section{ padding:6px 10px 4px; font:700 11px/14px var(--font); color:var(--text-muted); }

.mt-menu\_\_item\[aria-disabled="true"]{ color:var(--text-disabled); cursor:not-allowed; }

.mt-menu\_\_item\[aria-disabled="true"]:hover{ background:transparent; }



/\* ===== Dialog ===== \*/

.mt-dialog{ position:fixed; inset:0; z-index:1100; }

.mt-dialog\_\_scrim{ position:absolute; inset:0; background:var(--scrim); }

.mt-dialog\_\_panel{

&nbsp; position:relative; margin:10vh auto 0;

&nbsp; border-radius:8px; border:1px solid var(--border);

&nbsp; background:var(--surface); box-shadow:0 20px 50px rgba(0,0,0,.35);

&nbsp; display:flex; flex-direction:column;

}

.mt-dialog\_\_panel\[data-size="sm"]{ width:480px; }

.mt-dialog\_\_panel\[data-size="md"]{ width:600px; }

.mt-dialog\_\_panel\[data-size="lg"]{ width:680px; }

@media (max-width:720px){ .mt-dialog\_\_panel{ width:calc(100% - 32px); } }

.mt-dialog\_\_header{ padding:20px 24px 0; }

.mt-dialog\_\_title{ font:700 var(--type-lg); margin:0; color:var(--text); }

.mt-dialog\_\_body{ padding:16px 24px; font:var(--type-sm); color:var(--text); }

.mt-dialog\_\_error{ padding:0 24px 8px; font:var(--type-xs); color:var(--danger); }

.mt-dialog\_\_footer{ padding:16px 24px 20px; display:flex; justify-content:flex-end; gap:8px; }



/\* ===== Dropdown ===== \*/

.mt-field{ display:flex; flex-direction:column; gap:4px; }

.mt-field\_\_label{ font:700 var(--type-xs); color:var(--text-muted); }

.mt-field\_\_error{ font:var(--type-xs); color:var(--danger); }

.mt-field\_\_hint{ font:var(--type-xs); color:var(--text-muted); }



.mt-dropdown{

&nbsp; height:32px; padding:0 12px; display:flex; align-items:center; justify-content:space-between; gap:8px;

&nbsp; border-radius:4px; border:1px solid var(--border);

&nbsp; background:var(--surface); color:var(--text);

&nbsp; font:var(--type-sm); cursor:pointer;

}

.mt-dropdown:hover{ border-color:var(--text); }

.mt-dropdown:focus-visible{ outline:2px solid var(--focus-ring); outline-offset:2px; }

.mt-dropdown\[aria-expanded="true"]{ border-color:var(--accent); box-shadow:inset 0 -2px 0 var(--accent); }

.mt-field\[data-state="error"] .mt-dropdown{ border-color:var(--danger); }



/\* ===== Group list ===== \*/

.mt-group\_\_header{

&nbsp; width:100%; display:flex; align-items:center; gap:6px;

&nbsp; padding:6px 8px; border:0; background:transparent;

&nbsp; font:700 var(--type-sm); color:var(--text);

&nbsp; cursor:pointer; text-align:left;

}

.mt-group\_\_header:hover:not(:disabled){ background:var(--surface-hover); }

.mt-group\_\_header:focus-visible{ outline:2px solid var(--focus-ring); outline-offset:2px; }

.mt-group\_\_chevron{ color:var(--text-muted); transition:transform 120ms ease; }

.mt-group\_\_header\[aria-expanded="true"] .mt-group\_\_chevron{ transform:rotate(90deg); }

.mt-group\_\_header:disabled{ color:var(--text-disabled); cursor:not-allowed; }

.mt-group\_\_header:disabled .mt-group\_\_chevron{ color:var(--text-disabled); }

.mt-group\_\_content{ padding-left:20px; }



/\* ===== Coachmark ===== \*/

.mt-coachmark{ position:fixed; inset:0; z-index:1000; }

.mt-coachmark\_\_scrim{ position:absolute; inset:0; background:var(--scrim); }

.mt-coachmark\_\_panel{

&nbsp; position:absolute;

&nbsp; min-width:260px; max-width:420px;

&nbsp; border-radius:8px; border:1px solid var(--border);

&nbsp; background:var(--surface); box-shadow:var(--shadow-2);

&nbsp; padding:16px;

}

.mt-coachmark\_\_title{ font:700 var(--type-md); margin:0 0 8px; color:var(--text); }

.mt-coachmark\_\_body{ font:var(--type-sm); color:var(--text-muted); }

.mt-coachmark\_\_footer{ display:flex; justify-content:flex-end; gap:8px; margin-top:12px; }

.mt-coachmark\_\_close{

&nbsp; position:absolute; top:8px; right:8px;

&nbsp; width:28px; height:28px; border:0; background:transparent;

&nbsp; color:var(--text-muted); border-radius:4px; cursor:pointer;

}

.mt-coachmark\_\_close:hover{ background:var(--surface-hover); color:var(--text); }

.mt-coachmark\_\_close:focus-visible{ outline:2px solid var(--focus-ring); outline-offset:2px; }



/\* ===== Input ===== \*/

.mt-input{

&nbsp; height:32px; padding:0 12px;

&nbsp; display:flex; align-items:center; gap:8px;

&nbsp; border-radius:4px;

&nbsp; border:1px solid var(--input-border);

&nbsp; background:var(--input-bg);

&nbsp; color:var(--input-fg);

}

.mt-input\[data-size="sm"]{ height:24px; padding:0 8px; }

.mt-input:hover{ border-color:var(--input-border-hover); }



.mt-input\_\_control{

&nbsp; width:100%;

&nbsp; border:0;

&nbsp; outline:none;

&nbsp; background:transparent;

&nbsp; color:inherit;

&nbsp; font:var(--type-sm);

&nbsp; min-width:0;

}

.mt-input\[data-size="sm"] .mt-input\_\_control{ font:var(--type-xs); }

.mt-input\_\_control::placeholder{ color:var(--input-placeholder); }



.mt-input:focus-within{

&nbsp; border-color:var(--input-border-focus);

&nbsp; box-shadow: inset 0 -2px 0 var(--input-underline-focus);

}

.mt-input\_\_control:focus-visible{ outline:2px solid var(--focus-ring); outline-offset:2px; border-radius:2px; }



.mt-input\[data-disabled="true"]{ background:var(--surface-disabled); border-color:var(--border); color:var(--text-disabled); }

.mt-input\_\_control:disabled{ cursor:not-allowed; }



.mt-input\_\_prefix{ display:inline-flex; align-items:center; justify-content:center; flex:0 0 auto; }

.mt-input\_\_prefix--chip{

&nbsp; height:20px; padding:0 6px; border-radius:3px;

&nbsp; background:var(--input-prefix-bg); color:var(--input-prefix-fg);

&nbsp; font:600 11px/20px var(--font);

}

.mt-input\_\_prefix--icon{ width:16px; height:16px; border-radius:2px; background:var(--input-icon-bg); }



.mt-input\_\_end{

&nbsp; width:22px; height:22px; display:grid; place-items:center;

&nbsp; border:0; border-radius:3px;

&nbsp; background:transparent; color:var(--text-muted);

&nbsp; cursor:pointer;

}

.mt-input\_\_end:hover{ background:var(--surface-hover); color:var(--text); }

.mt-input\_\_end:focus-visible{ outline:2px solid var(--focus-ring); outline-offset:2px; }



.mt-field\[data-state="error"] .mt-input{

&nbsp; border-color:var(--danger);

&nbsp; box-shadow: inset 0 -2px 0 var(--danger);

}



/\* ===== Key value pair ===== \*/

.mt-kvp{ display:flex; flex-direction:column; gap:18px; }

.mt-kvp\_\_row{ display:grid; grid-template-columns:160px 1fr; column-gap:28px; align-items:start; }

.mt-kvp\_\_key{

&nbsp; font:700 var(--type-xs); color:var(--text-muted);

&nbsp; text-transform:uppercase; letter-spacing:.02em;

}

.mt-kvp\_\_value{ display:flex; flex-direction:column; gap:6px; }

.mt-kvp\_\_text-title{ font:600 var(--type-xs); color:var(--text); }

.mt-kvp\_\_text-sub{ font:var(--type-xs); color:var(--text-muted); }



/\* ===== Paragraph ===== \*/

.mt-paragraph{ max-width:520px; color:var(--text); }

.mt-paragraph\_\_headline{ margin:0 0 10px; font:700 var(--type-lg); color:var(--text); }

.mt-paragraph\_\_desc{ margin:0 0 18px; font:var(--type-xs); color:var(--text-muted); }

.mt-paragraph\_\_subhead{ margin:0 0 8px; font:700 var(--type-sm); color:var(--text); }

.mt-paragraph\_\_body{ margin:0 0 14px; font:var(--type-xs); color:var(--text-muted); }

.mt-paragraph\_\_meta{ margin:0; font:var(--type-xs); color:var(--text-muted); }



/\* ===== Picker ===== \*/

.mt-picker{ position:relative; }

.mt-picker\_\_panel{

&nbsp; position:absolute; top:calc(100% + 4px); left:0; width:100%;

&nbsp; max-height:280px; overflow:auto;

&nbsp; border-radius:6px; border:1px solid var(--picker-border);

&nbsp; background:var(--picker-bg); box-shadow:var(--picker-shadow);

&nbsp; padding:4px; display:none; z-index:100;

}

.mt-picker\[data-open="true"] .mt-picker\_\_panel{ display:block; }

.mt-picker\_\_option{

&nbsp; width:100%; height:40px;

&nbsp; display:flex; align-items:center; gap:10px;

&nbsp; padding:0 10px; border:0; border-radius:4px;

&nbsp; background:transparent; color:var(--text);

&nbsp; font:var(--type-sm); text-align:left; cursor:pointer;

}

.mt-picker\_\_option:hover{ background:var(--surface-hover); }

.mt-picker\_\_option\[data-selected="true"]{ background:var(--surface-pressed); }

.mt-picker\_\_option-label{ font-weight:600; }

.mt-picker\_\_option-meta{ font:var(--type-xs); color:var(--text-muted); }



.mt-avatar{

&nbsp; width:24px; height:24px; border-radius:999px;

&nbsp; background:var(--accent); color:var(--accent-contrast);

&nbsp; font:600 11px/24px var(--font); text-align:center;

}

.mt-picker\_\_file-icon{ width:20px; height:20px; border-radius:3px; background:var(--accent); }



/\* Date \*/

.mt-date\_\_header{ display:flex; justify-content:space-between; align-items:center; padding:6px 8px; font:600 var(--type-sm); }

.mt-date\_\_nav{

&nbsp; width:28px; height:28px; border:0; border-radius:4px;

&nbsp; background:transparent; color:var(--text-muted); cursor:pointer;

}

.mt-date\_\_nav:hover{ background:var(--surface-hover); }

.mt-date\_\_grid{ display:grid; grid-template-columns:repeat(7,1fr); gap:4px; padding:8px; }

.mt-date\_\_cell{

&nbsp; height:32px; border:0; border-radius:4px;

&nbsp; background:transparent; color:var(--text);

&nbsp; font:var(--type-xs); cursor:pointer;

}

.mt-date\_\_cell:hover{ background:var(--surface-hover); }

.mt-date\_\_cell\[data-selected="true"]{ background:var(--accent); color:var(--accent-contrast); }



/\* Time \*/

.mt-time\_\_row{ display:flex; gap:8px; padding:8px; }

.mt-time\_\_input{

&nbsp; flex:1; height:32px; border-radius:4px;

&nbsp; border:1px solid var(--border); background:var(--surface);

&nbsp; color:var(--text); padding:0 8px; font:var(--type-sm);

}

.mt-time\_\_input:focus{ outline:2px solid var(--focus-ring); outline-offset:2px; }



/\* ===== Pivot ===== \*/

.mt-pivot\_\_list{ display:flex; align-items:flex-end; gap:24px; }

.mt-pivot\_\_tab{

&nbsp; position:relative; height:32px; padding:0;

&nbsp; border:0; background:transparent; cursor:pointer;

&nbsp; font:600 var(--type-sm);

&nbsp; color:var(--pivot-fg);

}

.mt-pivot\_\_tab::after{

&nbsp; content:""; position:absolute; left:0; right:0; bottom:-2px;

&nbsp; height:2px; border-radius:2px; background:transparent; transition:120ms ease;

}

.mt-pivot\_\_tab:hover::after{ background:var(--pivot-underline-hover); }

.mt-pivot\_\_tab\[aria-selected="true"]{ color:var(--pivot-active-fg); }

.mt-pivot\_\_tab\[aria-selected="true"]::after{ background:var(--pivot-underline-active); }

.mt-pivot\_\_tab:focus-visible{ outline:2px solid var(--focus-ring); outline-offset:4px; border-radius:4px; }



/\* ===== Progress ===== \*/

.mt-progress{ display:flex; align-items:center; gap:14px; color:var(--text); }

.mt-progress\_\_spinner{

&nbsp; width:16px; height:16px; border-radius:999px;

&nbsp; border:2px solid var(--progress-spinner-track);

&nbsp; border-top-color: var(--progress-spinner-head);

&nbsp; box-sizing:border-box;

&nbsp; animation: mt-spin 900ms linear infinite;

}

@keyframes mt-spin{ to{ transform:rotate(360deg); } }



.mt-progress\[data-variant="determinate"]{ align-items:flex-start; gap:16px; }

.mt-progress\_\_text{ min-width:120px; }

.mt-progress\_\_label{ font:600 var(--type-xs); color:var(--text); margin:0 0 2px; }

.mt-progress\_\_desc{ font:var(--type-xs); color:var(--text-muted); margin:0; }

.mt-progress\_\_bar{

&nbsp; flex:1; min-width:220px; height:2px; border-radius:999px;

&nbsp; background:var(--progress-track); overflow:hidden; margin-top:8px;

}

.mt-progress\_\_fill{ height:100%; background:var(--progress-fill); border-radius:999px; transition:width 200ms ease; }

@media (prefers-reduced-motion: reduce){

&nbsp; .mt-progress\_\_spinner{ animation:none; }

&nbsp; .mt-progress\_\_fill{ transition:none; }

}



/\* ===== Radio (final) ===== \*/

.mt-radio-group{ display:flex; flex-direction:column; gap:8px; }

.mt-radio{

&nbsp; display:inline-flex; align-items:center; gap:8px;

&nbsp; cursor:pointer; font:var(--type-sm); color:var(--text); position:relative;

}

.mt-radio\_\_input{ position:absolute; opacity:0; pointer-events:none; }

.mt-radio\_\_control{

&nbsp; width:16px; height:16px; border-radius:999px;

&nbsp; border:1px solid var(--radio-border); background:transparent;

&nbsp; position:relative; transition:120ms ease;

}

.mt-radio\_\_control::after{

&nbsp; content:""; width:8px; height:8px; border-radius:999px;

&nbsp; background:var(--radio-dot);

&nbsp; position:absolute; top:50%; left:50%;

&nbsp; transform:translate(-50%,-50%) scale(.6);

&nbsp; opacity:0; transition:120ms ease;

}

.mt-radio:hover .mt-radio\_\_control{ border-color:var(--radio-border-hover); }

.mt-radio\_\_input:checked + .mt-radio\_\_control{ border-color:var(--accent); }

.mt-radio\_\_input:checked + .mt-radio\_\_control::after{ opacity:1; transform:translate(-50%,-50%) scale(1); }

.mt-radio\_\_input:focus-visible + .mt-radio\_\_control{ outline:2px solid var(--focus-ring); outline-offset:3px; }

.mt-radio\_\_input:disabled + .mt-radio\_\_control{ border-color:var(--radio-disabled-border); background:var(--radio-disabled-bg); }

.mt-radio\_\_input:disabled + .mt-radio\_\_control::after{ background:var(--radio-disabled-dot); }

.mt-radio\_\_input:disabled ~ .mt-radio\_\_label{ color:var(--text-disabled); cursor:not-allowed; }



/\* ===== Scroll region + scrollbars ===== \*/

.mt-scroll{

&nbsp; max-height:120px; overflow:auto;

&nbsp; padding:10px 12px;

&nbsp; border:1px solid var(--border);

&nbsp; border-radius:4px;

&nbsp; background:var(--surface);

&nbsp; color:var(--text);

&nbsp; font:var(--type-xs);

&nbsp; box-shadow: inset -10px 0 10px -12px var(--scroll-shadow);

&nbsp; scrollbar-width: thin;

&nbsp; scrollbar-color: var(--scroll-thumb) var(--scroll-track);

}

.mt-scroll::-webkit-scrollbar{ width:10px; height:10px; }

.mt-scroll::-webkit-scrollbar-track{ background:var(--scroll-track); border-radius:999px; }

.mt-scroll::-webkit-scrollbar-thumb{

&nbsp; background:var(--scroll-thumb); border-radius:999px;

&nbsp; border:3px solid var(--scroll-track);

}

.mt-scroll::-webkit-scrollbar-thumb:hover{ background:var(--scroll-thumb-hover); }

.mt-scroll::-webkit-scrollbar-thumb:active{ background:var(--scroll-thumb-active); }

.mt-scroll::-webkit-scrollbar-corner{ background:transparent; }



/\* ===== Search box ===== \*/

.mt-search\_\_box{

&nbsp; height:32px; padding:0 10px;

&nbsp; display:flex; align-items:center; gap:8px;

&nbsp; border-radius:4px;

&nbsp; border:1px solid transparent;

&nbsp; background:var(--search-bg);

&nbsp; color:var(--text);

}

.mt-search\_\_icon{ width:16px; height:16px; border-radius:2px; background:var(--search-icon); flex:0 0 auto; }

.mt-search\_\_input{

&nbsp; width:100%; border:0; outline:none; background:transparent;

&nbsp; color:inherit; font:var(--type-sm); min-width:0;

}

.mt-search\_\_input::placeholder{ color:var(--search-placeholder); }

.mt-search\_\_box:focus-within{ box-shadow: inset 0 -2px 0 var(--search-underline); }

.mt-search\_\_input:focus-visible{ outline:2px solid var(--focus-ring); outline-offset:2px; border-radius:2px; }

.mt-search\_\_clear{

&nbsp; width:22px; height:22px; display:grid; place-items:center;

&nbsp; border:0; border-radius:3px;

&nbsp; background:transparent; color:var(--text-muted);

&nbsp; cursor:pointer; flex:0 0 auto;

}

.mt-search\_\_clear:hover{ background:var(--surface-hover); color:var(--text); }

.mt-search\_\_clear:focus-visible{ outline:2px solid var(--focus-ring); outline-offset:2px; }



/\* ===== Side panel ===== \*/

.mt-sidepanel{ position:fixed; inset:0; z-index:1200; pointer-events:none; }

.mt-sidepanel\_\_scrim{ position:absolute; inset:0; background:var(--scrim); opacity:0; transition:opacity 180ms ease; }

.mt-sidepanel\_\_panel{

&nbsp; position:absolute; top:0; right:0; height:100%;

&nbsp; display:flex; flex-direction:column;

&nbsp; background:var(--surface);

&nbsp; border-left:1px solid var(--border);

&nbsp; box-shadow:var(--shadow-2);

&nbsp; transform:translateX(100%);

&nbsp; transition:transform 220ms ease;

&nbsp; pointer-events:auto;

}

.mt-sidepanel\_\_panel\[data-size="sm"]{ width:320px; }

.mt-sidepanel\_\_panel\[data-size="md"]{ width:400px; }

.mt-sidepanel\_\_panel\[data-size="lg"]{ width:480px; }

.mt-sidepanel\[data-open="true"]{ pointer-events:auto; }

.mt-sidepanel\[data-open="true"] .mt-sidepanel\_\_scrim{ opacity:1; }

.mt-sidepanel\[data-open="true"] .mt-sidepanel\_\_panel{ transform:translateX(0); }



.mt-sidepanel\_\_header{

&nbsp; height:56px; padding:0 16px;

&nbsp; display:flex; align-items:center; justify-content:space-between;

&nbsp; border-bottom:1px solid var(--border);

}

.mt-sidepanel\_\_title{ margin:0; font:700 var(--type-md); color:var(--text); }

.mt-sidepanel\_\_close{

&nbsp; width:32px; height:32px; border:0; border-radius:4px;

&nbsp; background:transparent; color:var(--text-muted); cursor:pointer;

}

.mt-sidepanel\_\_close:hover{ background:var(--surface-hover); color:var(--text); }

.mt-sidepanel\_\_close:focus-visible{ outline:2px solid var(--focus-ring); outline-offset:2px; }



.mt-sidepanel\_\_body{ flex:1; overflow:auto; padding:16px; color:var(--text); }

.mt-sidepanel\_\_footer{

&nbsp; padding:12px 16px; border-top:1px solid var(--border);

&nbsp; display:flex; justify-content:flex-end; gap:8px;

&nbsp; background:var(--surface);

}



/\* ===== Status label ===== \*/

.mt-status{ display:inline-flex; align-items:center; gap:6px; font:600 var(--type-xs); color:var(--status-fg); }

.mt-status\_\_icon{

&nbsp; width:14px; height:14px; display:grid; place-items:center;

&nbsp; font:700 10px/1 var(--font); color:currentColor;

}

.mt-status{ --status-fg: var(--status-color); }

.mt-status\[data-variant="critical"]{

&nbsp; height:18px; padding:0 8px; border-radius:3px;

&nbsp; background:var(--status-critical-bg); color:var(--status-critical-fg);

}

.mt-status\[data-variant="critical"] .mt-status\_\_icon{ color:var(--status-critical-fg); }

.mt-status\[data-variant="error"]{ --status-color: var(--status-error); }

.mt-status\[data-variant="warning"]{ --status-color: var(--status-warning); }

.mt-status\[data-variant="success"]{ --status-color: var(--status-success); }

.mt-status\[data-variant="info"]{ --status-color: var(--status-info); }



/\* ===== Toast ===== \*/

.mt-toast-stack{

&nbsp; position:fixed; bottom:16px; right:16px;

&nbsp; display:flex; flex-direction:column; gap:12px;

&nbsp; z-index:1300;

}

.mt-toast{

&nbsp; width:320px; border-radius:6px;

&nbsp; background:var(--toast-bg); color:var(--text);

&nbsp; border:1px solid var(--toast-border);

&nbsp; box-shadow:var(--shadow-2);

&nbsp; display:flex; flex-direction:column; overflow:hidden;

&nbsp; animation: mt-toast-in 180ms ease;

}

@keyframes mt-toast-in{ from{ transform:translateY(8px); opacity:0; } to{ transform:translateY(0); opacity:1; } }

.mt-toast\_\_header{ display:flex; align-items:flex-start; gap:10px; padding:12px 12px 8px; }

.mt-toast\_\_avatar{ width:28px; height:28px; border-radius:999px; background:var(--accent); flex:0 0 auto; }

.mt-toast\_\_meta{ flex:1; min-width:0; }

.mt-toast\_\_title{ font:600 var(--type-sm); color:var(--text); }

.mt-toast\_\_subtitle{ font:var(--type-xs); color:var(--text-muted); }

.mt-toast\_\_close{

&nbsp; width:28px; height:28px; border:0; background:transparent;

&nbsp; border-radius:4px; color:var(--text-muted); cursor:pointer;

}

.mt-toast\_\_close:hover{ background:var(--surface-hover); color:var(--text); }

.mt-toast\_\_close:focus-visible{ outline:2px solid var(--focus-ring); outline-offset:2px; }

.mt-toast\_\_body{ padding:0 12px 10px; }

.mt-toast\_\_message{ font:var(--type-xs); color:var(--text-muted); }

.mt-toast\_\_reply{ display:flex; align-items:center; gap:6px; padding:8px 10px 10px; border-top:1px solid var(--border); }

.mt-toast\_\_input{

&nbsp; flex:1; height:28px; border-radius:4px;

&nbsp; border:1px solid var(--border); background:var(--surface);

&nbsp; color:var(--text); padding:0 8px; font:var(--type-xs);

}

.mt-toast\_\_input:focus{ outline:2px solid var(--focus-ring); outline-offset:2px; }

.mt-toast\_\_send{

&nbsp; width:28px; height:28px; border:0; border-radius:4px;

&nbsp; background:var(--accent); color:var(--accent-contrast); cursor:pointer;

}

.mt-toast\_\_send:hover{ background:var(--accent-hover); }

.mt-toast\[data-variant="accent"]{ background:var(--accent); color:var(--accent-contrast); border-color:var(--accent); }

.mt-toast\[data-variant="accent"] .mt-toast\_\_subtitle,

.mt-toast\[data-variant="accent"] .mt-toast\_\_message{ color:rgba(255,255,255,.9); }

.mt-toast\[data-variant="accent"] .mt-toast\_\_close{ color:rgba(255,255,255,.8); }



/\* ===== Toggle (final) ===== \*/

.mt-toggle{ display:inline-flex; align-items:center; gap:8px; cursor:pointer; user-select:none; color:var(--text); }

.mt-toggle\_\_input{ position:absolute; opacity:0; pointer-events:none; }

.mt-toggle\_\_track{

&nbsp; width:28px; height:16px; border-radius:999px;

&nbsp; background:var(--toggle-track-off);

&nbsp; border:1px solid var(--toggle-border-off);

&nbsp; position:relative; transition:120ms ease; box-sizing:border-box;

}

.mt-toggle\_\_thumb{

&nbsp; width:12px; height:12px; border-radius:999px;

&nbsp; background:var(--toggle-thumb);

&nbsp; position:absolute; top:1px; left:1px;

&nbsp; transition:120ms ease;

}

.mt-toggle\_\_input:checked + .mt-toggle\_\_track{

&nbsp; background:var(--toggle-track-on);

&nbsp; border-color:var(--toggle-border-on);

}

.mt-toggle\_\_input:checked + .mt-toggle\_\_track .mt-toggle\_\_thumb{ transform:translateX(12px); }



.mt-toggle:hover .mt-toggle\_\_track{ background:var(--toggle-track-off-hover); border-color:var(--toggle-border-off-hover); }

.mt-toggle:hover .mt-toggle\_\_input:checked + .mt-toggle\_\_track{ background:var(--toggle-track-on-hover); border-color:var(--toggle-border-on-hover); }

.mt-toggle:active .mt-toggle\_\_track{ background:var(--toggle-track-off-pressed); border-color:var(--toggle-border-off-pressed); }

.mt-toggle:active .mt-toggle\_\_input:checked + .mt-toggle\_\_track{ background:var(--toggle-track-on-pressed); border-color:var(--toggle-border-on-pressed); }

.mt-toggle\_\_input:focus-visible + .mt-toggle\_\_track{ outline:2px solid var(--focus-ring); outline-offset:3px; }

.mt-toggle\_\_input:disabled + .mt-toggle\_\_track{ background:var(--toggle-track-disabled); border-color:var(--toggle-border-disabled); }

.mt-toggle\_\_input:disabled + .mt-toggle\_\_track .mt-toggle\_\_thumb{ background:var(--toggle-thumb-disabled); }

.mt-toggle\_\_input:disabled ~ .mt-toggle\_\_label{ color:var(--text-disabled); }



/\* ===== Tooltip ===== \*/

.mt-tooltip{

&nbsp; position:absolute; z-index:1400;

&nbsp; max-width:220px;

&nbsp; padding:6px 8px;

&nbsp; border-radius:4px;

&nbsp; font:var(--type-xs);

&nbsp; white-space:nowrap;

&nbsp; background:var(--tooltip-bg);

&nbsp; color:var(--tooltip-fg);

&nbsp; box-shadow:var(--tooltip-shadow);

&nbsp; opacity:0;

&nbsp; transform:translateY(2px);

&nbsp; pointer-events:none;

&nbsp; transition:opacity 120ms ease, transform 120ms ease;

}

.mt-tooltip\[data-open="true"]{ opacity:1; transform:translateY(0); }

.mt-tooltip::after{

&nbsp; content:"";

&nbsp; position:absolute;

&nbsp; width:8px; height:8px;

&nbsp; background:var(--tooltip-bg);

&nbsp; transform:rotate(45deg);

}

.mt-tooltip\[data-placement="top"]::after{ bottom:-4px; left:50%; transform:translateX(-50%) rotate(45deg); }

.mt-tooltip\[data-placement="bottom"]::after{ top:-4px; left:50%; transform:translateX(-50%) rotate(45deg); }

.mt-tooltip\[data-placement="left"]::after{ right:-4px; top:50%; transform:translateY(-50%) rotate(45deg); }

.mt-tooltip\[data-placement="right"]::after{ left:-4px; top:50%; transform:translateY(-50%) rotate(45deg); }

```



---



\# Theme definitions (Light + Dark)



\## Light theme



```css

:root\[data-theme="light"]{

&nbsp; --bg:#ffffff;



&nbsp; --surface:#ffffff;

&nbsp; --surface-2:#F7F7F7;

&nbsp; --surface-hover:#F3F2F1;

&nbsp; --surface-pressed:#EDEBE9;

&nbsp; --surface-disabled:#F3F2F1;



&nbsp; --text:#252423;

&nbsp; --text-muted:#605E5C;

&nbsp; --text-disabled:#A19F9D;



&nbsp; --border:#E1DFDD;

&nbsp; --border-strong:#C8C6C4;



&nbsp; --accent:#6264A7;

&nbsp; --accent-hover:#585A96;

&nbsp; --accent-pressed:#4F5187;

&nbsp; --accent-contrast:#ffffff;



&nbsp; --danger:#D13438;

&nbsp; --danger-2:#D13438;



&nbsp; --focus-ring:#6264A7;



&nbsp; --shadow-1:0 1px 2px rgba(0,0,0,0.08);

&nbsp; --shadow-2:0 6px 18px rgba(0,0,0,0.18);



&nbsp; --scrim:rgba(0,0,0,0.5);



&nbsp; /\* menu \*/

&nbsp; --menu-bg:#ffffff;

&nbsp; --menu-border:#E1DFDD;

&nbsp; --menu-shadow:0 6px 18px rgba(0,0,0,0.18);



&nbsp; /\* alerts \*/

&nbsp; --alert-error-bg:#FCF4F6;  --alert-error-border:#F3D6DC; --alert-error-fg:#A4262C; --alert-error-icon:#A4262C;

&nbsp; --alert-warn-bg:#FBF6D9;   --alert-warn-border:#F2E2A5;  --alert-warn-fg:#8A6A00;  --alert-warn-icon:#8A6A00;

&nbsp; --alert-ok-bg:#E7F2DA;     --alert-ok-border:#CDE6B3;    --alert-ok-fg:#107C10;    --alert-ok-icon:#107C10;

&nbsp; --alert-info-bg:#F5F5F5;   --alert-info-border:#E1DFDD;  --alert-info-fg:#252423;  --alert-info-icon:#605E5C;



&nbsp; /\* input \*/

&nbsp; --input-bg:#ffffff;

&nbsp; --input-fg:var(--text);

&nbsp; --input-border:var(--border);

&nbsp; --input-border-hover:var(--border-strong);

&nbsp; --input-border-focus:var(--accent);

&nbsp; --input-underline-focus:var(--accent);

&nbsp; --input-placeholder:var(--text-disabled);

&nbsp; --input-prefix-bg:var(--accent);

&nbsp; --input-prefix-fg:var(--accent-contrast);

&nbsp; --input-icon-bg:#605E5C;



&nbsp; /\* picker \*/

&nbsp; --picker-bg:#ffffff;

&nbsp; --picker-border:var(--border);

&nbsp; --picker-shadow:0 8px 24px rgba(0,0,0,0.18);



&nbsp; /\* pivot \*/

&nbsp; --pivot-fg:var(--text-muted);

&nbsp; --pivot-active-fg:var(--accent);

&nbsp; --pivot-underline-active:var(--accent);

&nbsp; --pivot-underline-hover:#C8C6C4;



&nbsp; /\* progress \*/

&nbsp; --progress-track:#E1DFDD;

&nbsp; --progress-fill:var(--accent);

&nbsp; --progress-spinner-track:#E1DFDD;

&nbsp; --progress-spinner-head:var(--accent);



&nbsp; /\* radio \*/

&nbsp; --radio-border:#C8C6C4;

&nbsp; --radio-border-hover:#605E5C;

&nbsp; --radio-dot:var(--accent);

&nbsp; --radio-disabled-border:#E1DFDD;

&nbsp; --radio-disabled-bg:#F3F2F1;

&nbsp; --radio-disabled-dot:#C8C6C4;



&nbsp; /\* scrollbars \*/

&nbsp; --scroll-track:transparent;

&nbsp; --scroll-thumb:#C8C6C4;

&nbsp; --scroll-thumb-hover:#A19F9D;

&nbsp; --scroll-thumb-active:#8A8886;

&nbsp; --scroll-shadow:rgba(0,0,0,0.18);



&nbsp; /\* search \*/

&nbsp; --search-bg:#F3F2F1;

&nbsp; --search-icon:#605E5C;

&nbsp; --search-placeholder:#A19F9D;

&nbsp; --search-underline:var(--accent);



&nbsp; /\* status \*/

&nbsp; --status-critical-bg:#C4314B;

&nbsp; --status-critical-fg:#ffffff;

&nbsp; --status-error:#C4314B;

&nbsp; --status-warning:#986F0B;

&nbsp; --status-success:#107C10;

&nbsp; --status-info:var(--text-muted);



&nbsp; /\* toast \*/

&nbsp; --toast-bg:#ffffff;

&nbsp; --toast-border:var(--border);



&nbsp; /\* toggle \*/

&nbsp; --toggle-track-off:#FFFFFF;

&nbsp; --toggle-border-off:#8A8886;

&nbsp; --toggle-thumb:#8A8886;

&nbsp; --toggle-track-off-hover:#FFFFFF;

&nbsp; --toggle-border-off-hover:#605E5C;

&nbsp; --toggle-track-off-pressed:#FFFFFF;

&nbsp; --toggle-border-off-pressed:#252423;



&nbsp; --toggle-track-on:var(--accent);

&nbsp; --toggle-border-on:var(--accent);

&nbsp; --toggle-track-on-hover:var(--accent-hover);

&nbsp; --toggle-border-on-hover:var(--accent-hover);

&nbsp; --toggle-track-on-pressed:var(--accent-pressed);

&nbsp; --toggle-border-on-pressed:var(--accent-pressed);



&nbsp; --toggle-track-disabled:#F3F2F1;

&nbsp; --toggle-border-disabled:#E1DFDD;

&nbsp; --toggle-thumb-disabled:#C8C6C4;



&nbsp; /\* tooltip \*/

&nbsp; --tooltip-bg:#323130;

&nbsp; --tooltip-fg:#ffffff;

&nbsp; --tooltip-shadow:0 6px 16px rgba(0,0,0,0.25);

}

```



\## Dark theme



```css

:root\[data-theme="dark"]{

&nbsp; --bg:#1B1B1B;



&nbsp; --surface:#2B2B2B;

&nbsp; --surface-2:#242424;

&nbsp; --surface-hover:#3A3A3A;

&nbsp; --surface-pressed:#444444;

&nbsp; --surface-disabled:#3A3A3A;



&nbsp; --text:#ffffff;

&nbsp; --text-muted:#C8C8C8;

&nbsp; --text-disabled:#8A8886;



&nbsp; --border:#3F3F3F;

&nbsp; --border-strong:#5A5A5A;



&nbsp; --accent:#7B83EB;

&nbsp; --accent-hover:#A6ABFF;

&nbsp; --accent-pressed:#4F52B2;

&nbsp; --accent-contrast:#ffffff;



&nbsp; --danger:#F1707B;

&nbsp; --danger-2:#F1707B;



&nbsp; --focus-ring:#7B83EB;



&nbsp; --shadow-1:0 1px 2px rgba(0,0,0,0.35);

&nbsp; --shadow-2:0 10px 28px rgba(0,0,0,0.6);



&nbsp; --scrim:rgba(0,0,0,0.75);



&nbsp; /\* menu \*/

&nbsp; --menu-bg:#2B2B2B;

&nbsp; --menu-border:#3F3F3F;

&nbsp; --menu-shadow:0 10px 28px rgba(0,0,0,0.6);



&nbsp; /\* alerts \*/

&nbsp; --alert-error-bg:#3E1F25;  --alert-error-border:#6B2B34; --alert-error-fg:#F1707B; --alert-error-icon:#F1707B;

&nbsp; --alert-warn-bg:#463100;   --alert-warn-border:#7A5A00;  --alert-warn-fg:#FFD86A; --alert-warn-icon:#FFD86A;

&nbsp; --alert-ok-bg:#0D2E0D;     --alert-ok-border:#1E5A1E;    --alert-ok-fg:#7FE07F;  --alert-ok-icon:#7FE07F;

&nbsp; --alert-info-bg:#1F1F1F;   --alert-info-border:#3F3F3F;  --alert-info-fg:#ffffff; --alert-info-icon:#C8C8C8;



&nbsp; /\* input \*/

&nbsp; --input-bg:var(--surface);

&nbsp; --input-fg:var(--text);

&nbsp; --input-border:var(--border);

&nbsp; --input-border-hover:var(--border-strong);

&nbsp; --input-border-focus:var(--accent);

&nbsp; --input-underline-focus:var(--accent);

&nbsp; --input-placeholder:var(--text-disabled);

&nbsp; --input-prefix-bg:var(--accent);

&nbsp; --input-prefix-fg:var(--accent-contrast);

&nbsp; --input-icon-bg:#C8C8C8;



&nbsp; /\* picker \*/

&nbsp; --picker-bg:var(--surface);

&nbsp; --picker-border:var(--border);

&nbsp; --picker-shadow:0 12px 30px rgba(0,0,0,0.6);



&nbsp; /\* pivot \*/

&nbsp; --pivot-fg:var(--text-muted);

&nbsp; --pivot-active-fg:var(--accent);

&nbsp; --pivot-underline-active:var(--accent);

&nbsp; --pivot-underline-hover:#8A8886;



&nbsp; /\* progress \*/

&nbsp; --progress-track:#5A5A5A;

&nbsp; --progress-fill:var(--accent);

&nbsp; --progress-spinner-track:#5A5A5A;

&nbsp; --progress-spinner-head:#ffffff;



&nbsp; /\* radio \*/

&nbsp; --radio-border:#8A8886;

&nbsp; --radio-border-hover:#C8C8C8;

&nbsp; --radio-dot:var(--accent);

&nbsp; --radio-disabled-border:#3F3F3F;

&nbsp; --radio-disabled-bg:#2B2B2B;

&nbsp; --radio-disabled-dot:#5A5A5A;



&nbsp; /\* scrollbars \*/

&nbsp; --scroll-track:transparent;

&nbsp; --scroll-thumb:#5A5A5A;

&nbsp; --scroll-thumb-hover:#8A8886;

&nbsp; --scroll-thumb-active:#C8C8C8;

&nbsp; --scroll-shadow:rgba(0,0,0,0.55);



&nbsp; /\* search \*/

&nbsp; --search-bg:#2B2B2B;

&nbsp; --search-icon:#C8C8C8;

&nbsp; --search-placeholder:#8A8886;

&nbsp; --search-underline:var(--accent);



&nbsp; /\* status \*/

&nbsp; --status-critical-bg:#C4314B;

&nbsp; --status-critical-fg:#ffffff;

&nbsp; --status-error:#F1707B;

&nbsp; --status-warning:#FFD86A;

&nbsp; --status-success:#7FE07F;

&nbsp; --status-info:var(--text-muted);



&nbsp; /\* toast \*/

&nbsp; --toast-bg:#2B2B2B;

&nbsp; --toast-border:var(--border);



&nbsp; /\* toggle \*/

&nbsp; --toggle-track-off:#1F1F1F;

&nbsp; --toggle-border-off:#8A8886;

&nbsp; --toggle-thumb:#8A8886;

&nbsp; --toggle-track-off-hover:#1F1F1F;

&nbsp; --toggle-border-off-hover:#C8C8C8;

&nbsp; --toggle-track-off-pressed:#1F1F1F;

&nbsp; --toggle-border-off-pressed:#FFFFFF;



&nbsp; --toggle-track-on:var(--accent);

&nbsp; --toggle-border-on:var(--accent);

&nbsp; --toggle-track-on-hover:#A6ABFF;

&nbsp; --toggle-border-on-hover:#A6ABFF;

&nbsp; --toggle-track-on-pressed:var(--accent-pressed);

&nbsp; --toggle-border-on-pressed:var(--accent-pressed);



&nbsp; --toggle-track-disabled:#2B2B2B;

&nbsp; --toggle-border-disabled:#3F3F3F;

&nbsp; --toggle-thumb-disabled:#5A5A5A;



&nbsp; /\* tooltip \*/

&nbsp; --tooltip-bg:#3B3A39;

&nbsp; --tooltip-fg:#ffffff;

&nbsp; --tooltip-shadow:0 8px 20px rgba(0,0,0,0.6);

}

```



---



\## Usage



```html

<body data-theme="light">…</body>

<!-- or -->

<body data-theme="dark">…</body>

```



