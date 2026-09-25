import { READER_WIDE_QUERY } from "./readerLayout.js";

/*
 * stageLayer — the one place the reader's full-bleed stage layer is named.
 *
 * TextComp renders `#reader-stage-layer` beside the prose column; inline
 * widget stages (WidgetBreakout, kind: "inline") teleport into it at desktop
 * widths so the column's overflow clip cannot cut them off (OPENBRAIN-37).
 * Both sides import the id from here so they cannot drift apart.
 */
export const STAGE_LAYER_ID = "reader-stage-layer";

/* The reader's two-column breakpoint (readerLayout.js), where the
   full-bleed stage engages. */
export const STAGE_DESKTOP_QUERY = READER_WIDE_QUERY;
