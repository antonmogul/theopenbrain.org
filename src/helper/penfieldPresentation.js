/** Presentation only: source-pixel bounds of printed, mapped numerals.
 * The source appendix, coordinates, scans and unconfirmed labels are untouched.
 * Tight polygons avoid adjacent sulci and leader lines; never replace these
 * with a generic radius around the hotspot (notably N.C. 23 and S. Be. 19).
 * Original scan mode removes this entire layer.
 */
export const PENFIELD_TITLE =
  "Find out what it was like to be Dr. Wilder Penfield";
const box = (id, x, y, w, h) => ({
  id,
  polygon: `${x},${y} ${x + w},${y} ${x + w},${y + h} ${x},${y + h}`,
});
export const PENFIELD_LABELS = {
  rw: {
    fontSize: 16,
    masks: [
      box("22", 159, 181, 23, 16),
      box("23", 206, 271, 24, 16),
      box("24", 80, 126, 22, 16),
      box("28", 149, 242, 23, 16),
      box("30", 274, 189, 23, 16),
      box("31", 226, 170, 20, 16),
      box("32", 248, 181, 21, 16),
    ],
  },
  abra: {
    fontSize: 14,
    masks: [
      { id: "15", polygon: "290,195 310,201 310,211 290,211" },
      { id: "16", polygon: "317,207 336,214 336,221 317,221" },
      // The final stem of 17 sits beside a short sulcus, below the 7.
      { id: "17", polygon: "336,214 354,221 354,225 336,225" },
      { id: "18", polygon: "365,230 385,240 385,245 365,245" },
      box("19", 248, 168, 21, 17),
      box("23", 289, 221, 21, 15),
      box("26", 321, 717, 21, 15),
      { id: "27", polygon: "269,541 287,541 291,550 291,557 269,557" },
      { id: "28", polygon: "241,541 259,541 262,553 262,556 241,556" },
    ],
  },
  yn: {
    fontSize: 32,
    masks: [
      box("26", 628, 468, 50, 31),
      box("25", 548, 503, 45, 32),
      box("27", 738, 427, 47, 31),
      box("28", 772, 395, 47, 32),
      box("33", 684, 448, 47, 31),
    ],
  },
  gp: {
    fontSize: 30,
    masks: [box("14", 422, 456, 38, 29), box("15", 439, 416, 37, 29)],
  },
  sbe: {
    fontSize: 30,
    masks: [
      { id: "14", polygon: "591,405 629,418 629,434 591,434" },
      { id: "15", polygon: "536,385 568,397 568,412 536,412" },
      { id: "16", polygon: "676,440 710,459 710,473 676,473" },
      { id: "17", polygon: "707,465 739,485 739,494 707,494" },
      { id: "18", polygon: "614,449 649,449 649,482 629,482 614,475" },
      {
        id: "19",
        polygon: "502,365 526,365 534,371 530,379 534,379 534,392 502,392",
      },
      box("21", 522, 467, 32, 30),
      box("23", 547, 431, 43, 29),
      {
        id: "24",
        polygon:
          "585,978 601,978 612,983 614,981 614,978 627,978 627,1007 585,1007",
      },
      { id: "25", polygon: "605,1006 648,1006 648,1035 609,1035 605,1031" },
      box("26", 369, 530, 38, 29),
      { id: "27", polygon: "490,395 530,395 530,424 501,424 490,419" },
      box("28", 648, 514, 42, 31),
      box("29", 648, 1028, 43, 29),
    ],
  },
  nc: {
    fontSize: 32,
    masks: [
      box("19", 513, 643, 41, 32),
      box("20", 561, 596, 49, 32),
      // Keep the diagonal sulcus entering the upper-left of the printed 2.
      { id: "23", polygon: "532,516 560,516 560,549 512,549 512,533" },
    ],
  },
  ge: {
    fontSize: 32,
    masks: [
      box("1b", 313, 548, 43, 35),
      box("1c", 345, 429, 34, 32),
      box("2b", 463, 589, 51, 34),
      box("3", 717, 463, 22, 32),
      box("16", 638, 437, 42, 32),
    ],
  },
};
