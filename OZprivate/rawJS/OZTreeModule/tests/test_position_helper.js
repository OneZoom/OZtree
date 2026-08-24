/**
  * Usage: npx babel-tape-runner OZprivate/rawJS/OZTreeModule/tests/test_position_helper.js
  */
import * as position_helper from '../src/position_helper.js';
import { resolve_pinpoints } from '../src/navigation/pinpoint.js';
import { populate_factory } from './util_factory'
import { setup_dom } from './util_dom';
import test from 'tape';

import tree_state from '../src/tree_state.js'
import get_projection from '../src/projection/projection.js';
import { set_pre_calculator } from '../src/projection/pre_calc/pre_calc';
import { set_horizon_calculator } from '../src/projection/horizon_calc/horizon_calc';

function fake_controller(factory, widthres, heightres) {
  tree_state.setup_canvas({ width: widthres, height: heightres }, widthres, heightres);

  const controller = {
    root: factory.get_root(),
    tree_state: tree_state,
    projection: get_projection(),
    factory: factory,
  };

  // Helpers from src/controller/controller.js
  controller.re_calc = function () {
    this.projection.re_calc(this.root, this.tree_state.xp, this.tree_state.yp, this.tree_state.ws);
  }.bind(controller);

  controller.reanchor = function () {
    position_helper.reanchor(this.root);
  }.bind(controller);

  controller.trigger_refresh_loop = function () {
    // Don't do anything here
  }.bind(controller);

  controller.get_graphref_node = function () {
    function gr(node) {
      for (let i=0; i<node.children.length; i++) {
        if (node.children[i].graphref) return gr(node.children[i]);
      }
      // No children are graphref, this must be a leaf or the end of the path
      return node;
    }
    return gr(this.root);
  }

  // tree_settings.vis
  set_pre_calculator('spiral');
  set_horizon_calculator('bezier');

  // dynamic_load_and_calc
  controller.re_calc();
  controller.projection.pre_calc(controller.root);
  controller.projection.calc_horizon(controller.root)
  controller.projection.update_parent_horizon(controller.root)
  controller.projection.highlight_propogate(controller.root)
  
  return controller;
}

function move_to(controller, node, opts) {
  // Rough parallel to Controller.prototype.leap_to / Controller.prototype.fly_on_tree_to

  return Promise.resolve().then(() => {
    controller.tree_state.flying = true;
    // develop_branch_to_and_target
    controller.factory.dynamic_loading_by_metacode(node.ozid)
    position_helper.clear_target(controller.root);
    position_helper.target_by_code(controller.root, node.ozid);

    return position_helper.perform_actual_fly(
      controller,
      !!opts.into_node,
      opts.speed || 1,
      opts.accel_type || 'linear',
    );
  }).finally(() => {
    controller.tree_state.flying = false;
  })
}
function round(x) {
  return Math.round(x * 10000) / 10000;
}

function test_cur_location(test, controller, node_latin_name, exp_xp, exp_yp, exp_ws, message) {
  const target = controller.get_graphref_node();

  test.deepEqual({
    graphref: target.latin_name || target.ozid,
    xp: round(controller.tree_state.xp),
    yp: round(controller.tree_state.yp),
    ws: round(controller.tree_state.ws),
  }, {
    graphref: node_latin_name,
    xp: round(exp_xp),
    yp: round(exp_yp),
    ws: round(exp_ws),
  }, "At " + node_latin_name + " - " + message);

  // Anchoring on a node far bigger than the screen leaves every position we work out from
  // it a small difference between large numbers, so reanchor() should have come down to
  // something of a workable size before settling on it
  const anchor_size = 220 * controller.tree_state.ws;
  test.ok(!target.has_child || (anchor_size > 1 && anchor_size < 2200),
    "Anchored on a node of a workable size (" + round(anchor_size) + "px) - " + message);
}

/**
 * Where (node) ended up on screen, which is what the viewer actually sees.
 *
 * xp/yp/ws above are only meaningful next to the node they are anchored on, so a change to
 * which node that is rewrites all of them without the view having moved at all. Check both,
 * and the pair tells you which of the two you have changed.
 */
function test_node_on_screen(test, controller, node, exp_x, exp_y, exp_r, message) {
  controller.re_calc();

  test.deepEqual({
    x: round(node.xvar),
    y: round(node.yvar),
    r: round(node.rvar),
  }, {
    x: round(exp_x),
    y: round(exp_y),
    r: round(exp_r),
  }, "On screen: " + (node.latin_name || node.ozid) + " - " + message);
}

test('perform_actual_fly', function (test) {
  // NB: setup_canvas fires window_size_change hooks, which may read (window)
  setup_dom(test);

  global.requestAnimationFrame = (callback) => setTimeout(callback, 16);
  global.cancelAnimationFrame = clearTimeout;
  var nodes = {};
  
  return populate_factory().then((factory) => {
    // Gather some test points
    return resolve_pinpoints([
      '@biota=93302',
      '@Dobsonia=988790',  // Bare-backed fruit bats
      '@Acerodon=635024', // Flying foxes
      '@Pteropus=813030', // Flying foxes
      '@Pteralopex_atrata=164526', // Monkey-faced bat
    ]).then((pps) => pps.forEach((pp) => {
      nodes[pp.sciname] = factory.dynamic_loading_by_metacode(pp.ozid)
    })).then(() => {
      return factory;
    });

  }).then(function (factory) {
    var controller = fake_controller(factory, 2000, 1000);
    return Promise.resolve().then(() => {
      return move_to(controller, nodes['Dobsonia'], {speed: Infinity}).then(() => {
        test_cur_location(test, controller, 836249, 1464.4098, 1157.1168, 1.5132, "Retargeted, jumped");
        test_node_on_screen(test, controller, nodes['Dobsonia'], 1069.8041, 978.1592, 256.0792, "Retargeted, jumped");
      });
    }).then(() => {
      return move_to(controller, nodes['biota'], {speed: Infinity}).then(() => {
        test_cur_location(test, controller, "biota", 801.3117, 1170.5032, 1.5371, "Retargeted, jumped");
        test_node_on_screen(test, controller, nodes['biota'], 801.3117, 1170.5032, 338.1551, "Retargeted, jumped");
      });
    }).then(() => {
      return move_to(controller, nodes['Dobsonia'], {speed: Infinity}).then(() => {
        test_cur_location(test, controller, 836249, 1464.4098, 1157.1168, 1.5132, "Went back again, Dobsonia in same place");
        test_node_on_screen(test, controller, nodes['Dobsonia'], 1069.8041, 978.1592, 256.0792, "Went back again, Dobsonia in same place");
      });
    }).then(() => {
      return move_to(controller, nodes['Acerodon'], {speed: 1}).then(() => {
        test_cur_location(test, controller, 836249, -2237.239, 692.653, 2.4967, "Flights to nearby location");
        test_node_on_screen(test, controller, nodes['Acerodon'], 594.6564, 625.457, 250.0075, "Flights to nearby location");
      });
    }).then(() => {
      return move_to(controller, nodes['Dobsonia'], {speed: 1}).then(() => {
        test_cur_location(test, controller, 836249, 1464.4098, 1157.1168, 1.5132, "Flight back");
        test_node_on_screen(test, controller, nodes['Dobsonia'], 1069.8041, 978.1592, 256.0792, "Flight back");
      });
    });

  }).then(function () {
    test.end();
  }).catch(function (err) {
    console.log(err.stack);
    test.fail(err);
    test.end();
  })
});

/**
 * A flight outwards from deep in the tree has to hold onto where it is whilst it works in
 * numbers the size of the node it is flying to, which is enormous next to the screen when
 * we are a long way inside it. Get that wrong and the view lurches about instead of
 * drawing back smoothly.
 */
test('perform_actual_fly: flying out from a deep zoom keeps hold of the view', function (test) {
  setup_dom(test);

  // Drive the flight off a clock of our own, one frame's worth at a time, so that the
  // flight is the same length however fast the machine running the tests happens to be
  const real_performance = global.performance;
  let fake_now = 0;
  global.performance = { now: () => fake_now };
  global.requestAnimationFrame = (callback) => setTimeout(() => {
    fake_now += 1000 / 60;
    callback();
  }, 0);
  global.cancelAnimationFrame = clearTimeout;
  var nodes = {}, frames = [], watch = null;

  /**
   * Screen size/position of (watch), worked down from whatever we are anchored on.
   *
   * The anchor is always one of its ancestors here, so this is a plain walk down the tree,
   * and unlike xp/yp/ws it means the same thing either side of a re-anchor.
   */
  function watch_on_screen(controller) {
    const path = [];
    for (let n = watch; n; n = n.upnode) path.push(n);

    let x = tree_state.xp, y = tree_state.yp, r = 220 * tree_state.ws;
    for (let i = path.indexOf(controller.get_graphref_node()) - 1; i >= 0; i--) {
      const parent = path[i + 1], ci = parent.children.indexOf(path[i]);
      x = x + r * parent.nextx[ci];
      y = y + r * parent.nexty[ci];
      r = r * parent.nextr[ci];
    }
    return { x: x, y: y, r: r };
  }

  return populate_factory().then((factory) => {
    return resolve_pinpoints([
      '@biota=93302',
      '@Pteralopex_atrata=164526', // Monkey-faced bat
    ]).then((pps) => pps.forEach((pp) => {
      nodes[pp.sciname] = factory.dynamic_loading_by_metacode(pp.ozid)
    })).then(() => factory);

  }).then(function (factory) {
    var controller = fake_controller(factory, 2000, 1000);
    controller.trigger_refresh_loop = function () {
      frames.push(watch_on_screen(controller));
    };

    return move_to(controller, nodes['Pteralopex atrata'], {speed: Infinity}).then(() => {
      // Park on the leaf, zoomed as far in as we would be inside the real tree. The test
      // tree is too shallow to get here by flying, but the arithmetic doesn't care how we
      // arrived, only how big the node we then fly to is next to the screen
      watch = nodes['Pteralopex atrata'];
      position_helper.reanchor_at_node(watch, controller.root);
      tree_state.xp = tree_state.focal_area.xcentre;
      tree_state.yp = tree_state.focal_area.ycentre;
      tree_state.ws = 1e15;
      controller.re_calc();

      frames = [watch_on_screen(controller)];
      return move_to(controller, nodes['biota'], {speed: 1});
    }).then(() => {
      // The leaf we set off from should draw back steadily. Any frame that moves it a long
      // way is the view jumping, however smooth the zoom either side of it looks
      let worst = 0, worst_at = -1;
      frames.forEach((f, i) => {
        if (i === 0) return;
        const moved = Math.hypot(f.x - frames[i - 1].x, f.y - frames[i - 1].y);
        if (moved > worst) { worst = moved; worst_at = i; }
      });

      test.ok(frames.length > 100, "Flew out over " + frames.length + " frames");
      test.ok(worst < 25, "Leaf never jumps: worst frame moves it " +
        worst.toFixed(1) + "px, at frame " + worst_at + " of " + frames.length);
      // ...and it did actually draw back, rather than staying put
      test.ok(frames[frames.length - 1].r < frames[0].r * 1e-6,
        "Leaf shrank from " + frames[0].r.toExponential(2) + " to " +
        frames[frames.length - 1].r.toExponential(2) + "px");
    });

  }).finally(function () {
    global.performance = real_performance;
  }).then(function () {
    test.end();
  }).catch(function (err) {
    console.log(err.stack);
    test.fail(err);
    test.end();
  })
});


test.onFinish(function() {

  global.requestAnimationFrame = undefined;
  global.cancelAnimationFrame = undefined;
});
