/**
  * Usage: npx babel-tape-runner OZprivate/rawJS/OZTreeModule/tests/test_position_helper.js
  */
import * as position_helper from '../src/position_helper.js';
import { resolve_pinpoints } from '../src/navigation/pinpoint.js';
import { populate_factory } from './util_factory'
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

  return new Promise((resolve, reject) => {
    // develop_branch_to_and_target
    controller.factory.dynamic_loading_by_metacode(node.ozid)
    position_helper.clear_target(controller.root);
    position_helper.target_by_code(controller.root, node.ozid);

    position_helper.perform_actual_fly(
      controller,
      !!opts.into_node,
      opts.speed || 1,
      opts.accel_type || 'linear',
      resolve,
      () => reject(new Error("Flight interrupted")),
    );
  });
}
function test_cur_location(test, controller, node_latin_name, exp_xp, exp_yp, exp_ws, message) {
  function round(x) {
    return Math.round(x * 10000) / 10000;
  }
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
  exp_xp = round(exp_xp);
}

test('perform_actual_fly', function (test) {
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
        test_cur_location(test, controller, "Laurasiatheria", 28826.0739, -18858.2284, 48.0688, "Retargeted, jumped");
      });
    }).then(() => {
      return move_to(controller, nodes['biota'], {speed: Infinity}).then(() => {
        test_cur_location(test, controller, "biota", 801.3117, 1170.5032, 1.5371, "Retargeted, jumped");
      });
    }).then(() => {
      return move_to(controller, nodes['Dobsonia'], {speed: Infinity}).then(() => {
        test_cur_location(test, controller, "Laurasiatheria", 28826.0739, -18858.2284, 48.0688, "Went back again, Dobsonia in same place");
      });
    }).then(() => {
      return move_to(controller, nodes['Acerodon'], {speed: 1}).then(() => {
        test_cur_location(test, controller, "Laurasiatheria", 42907.5839, -32331.2601, 79.3102, "Flights to nearby location");
      });
    }).then(() => {
      return move_to(controller, nodes['Dobsonia'], {speed: 1}).then(() => {
        test_cur_location(test, controller, "Laurasiatheria", 28826.0739, -18858.2284, 48.0688, "Flight back");
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


test.onFinish(function() {
  
  global.requestAnimationFrame = undefined;
  global.cancelAnimationFrame = undefined;
  // NB: Something data_repo includes in is holding node open.
  //     Can't find it so force our tests to end.
  process.exit(0)
});
