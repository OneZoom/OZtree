/* add features to the OZ controller to control highlights on the tree */
import { resolve_highlights, current_highlights, highlight_update } from '../projection/highlight/highlight.js';
import { color_theme } from '../themes/color_theme';

export default function (Controller) {
  /**
   * Replace all current highlights with provided highlight strings
   * @param highlight_strs Array of highlight strings, see src/projection/highlight/highlight.js for definition
   */
  Controller.prototype.highlight_replace = function (highlight_strs) {
    return resolve_highlights(
      highlight_strs,
      (existing) => color_theme.pick_marked_area_color(existing, this.root),
    ).then((highlights) => {
      highlight_update(this.root, highlights);
      this.trigger_refresh_loop();
    });
  };

  /**
   * Add a new highlight string to existing highlights
   * @param highlight_str Highlight string, see src/projection/highlight/highlight.js for definition
   */
  Controller.prototype.highlight_add = function (highlight_str) {
    return resolve_highlights(
      [].concat(current_highlights(), [highlight_str]),
      (existing) => color_theme.pick_marked_area_color(existing, this.root),
    ).then((highlights) => {
      highlight_update(this.root, highlights);
      this.trigger_refresh_loop();
      return highlights[0];
    });
  };

  /**
   * Remove a single highlight from existing highlights
   * @param highlight_str Highlight string, see src/projection/highlight/highlight.js for definition
   */
  Controller.prototype.highlight_remove = function (highlight_str) {
      highlight_update(this.root, current_highlights().filter((h) => h.str === highlight_str));
      this.trigger_refresh_loop();

      return Promise.resolve();
  };

  /**
   * Get list of all active highlight strings
   */
  Controller.prototype.highlight_list = function () {
    return current_highlights().map((h) => h.str);
  };

  /**
   * Get all detail on all active highlight strings
   */
  Controller.prototype.highlight_detail = function () {
    return current_highlights();
  };
}
