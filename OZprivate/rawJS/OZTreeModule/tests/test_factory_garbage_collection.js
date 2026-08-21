/**
  * Usage: npx babel-tape-runner OZprivate/rawJS/OZTreeModule/tests/test_factory_garbage_collection.js
  */
import test from 'tape';

import config from '../src/global_config';
import { init as gc_init } from '../src/factory/garbage_collection';
import { call_hook, remove_hook } from '../src/util/hook';
import { populate_factory } from './util_factory'

const orig_detach_level = config.gc.detach_level;
const orig_generations = config.generation_on_subbranch_during_fly;

/**
  * Set the 2 config options garbage collection considers, restoring the
  * defaults once (test) has finished
  */
function with_gc_config(test, detach_level, generations) {
  config.gc.detach_level = detach_level;
  config.generation_on_subbranch_during_fly = generations;
  test.teardown(() => {
    config.gc.detach_level = orig_detach_level;
    config.generation_on_subbranch_during_fly = orig_generations;
  });
}

/**
  * Remove every hook init() registers, so a leftover one doesn't collect the
  * tree out from under a later test file
  */
function remove_gc_hooks() {
  remove_hook('after_draw');
  remove_hook('flying_finish');
}

/**
  * Return a fresh tree with (depth) generations of children developed, and
  * nothing else (build_tree() develops no children of its own)
  */
function fresh_tree(factory, depth) {
  factory.build_tree();
  factory.root.develop_children(depth);
  return factory.root;
}

/**
  * Dotted child-index path of every developed node at or below (node), e.g.
  * ['root', '0', '0.0', '0.1', '1', ...]. Undeveloped children are skipped, so
  * this is what garbage collection has left behind.
  */
function developed_paths(node, prefix = 'root') {
  let out = [prefix];

  for (let i = 0; i < node.children.length; i++) {
    if (node.children[i]) {
      out = out.concat(developed_paths(node.children[i], prefix === 'root' ? String(i) : prefix + '.' + i));
    }
  }
  return out;
}

/** The deepest generation with any developed node in it, root being 0 */
function max_depth(node) {
  return Math.max(...developed_paths(node).map((p) => p === 'root' ? 0 : p.split('.').length));
}

test('init: Adds an after_draw hook that collects garbage', function (test) {
  return populate_factory().then((factory) => {
    with_gc_config(test, 1, 1);
    test.teardown(remove_gc_hooks);
    let root = fresh_tree(factory, 4);

    // Before init() the after_draw hook does nothing
    call_hook('after_draw');
    test.deepEqual(max_depth(root), 5, 'Tree untouched without a hook to do it');

    // ...but once registered, drawing collects everything out of reach
    gc_init();
    call_hook('after_draw');
    test.deepEqual(developed_paths(root), ['root', '0', '1'], 'Everything below the 1st generation collected');

  }).then(function () {
    test.end();
  }).catch(function (err) {
    console.log(err.stack);
    test.fail(err);
    test.end();
  })
});

test('clear_garbage: Collects generations beyond the configured levels', function (test) {
  return populate_factory().then((factory) => {
    with_gc_config(test, 2, 2);
    test.teardown(remove_gc_hooks);
    gc_init();
    let root = fresh_tree(factory, 4);

    test.deepEqual(max_depth(root), 5, 'Started with 5 generations below the root')

    // A node is undeveloped once it is itself detach_level generations out of reach,
    // so the node at that generation survives---it's everything below that goes
    call_hook('after_draw');
    test.deepEqual(developed_paths(root), [
      'root',
      '0', '0.0', '0.1',
      '1', '1.0', '1.1',
    ], 'Kept 2 generations below the root, collected the rest');

  }).then(function () {
    test.end();
  }).catch(function (err) {
    console.log(err.stack);
    test.fail(err);
    test.end();
  })
});

test('clear_garbage: Keeps the greater of detach_level / generation_on_subbranch_during_fly', function (test) {
  return populate_factory().then((factory) => {
    with_gc_config(test, 1, 3);
    test.teardown(remove_gc_hooks);
    gc_init();

    // Both conditions have to be met to collect, so the larger config option wins
    let root = fresh_tree(factory, 4);
    call_hook('after_draw');
    test.deepEqual(max_depth(root), 3, 'generation_on_subbranch_during_fly = 3 wins over detach_level = 1');

    config.gc.detach_level = 3;
    config.generation_on_subbranch_during_fly = 1;
    root = fresh_tree(factory, 4);
    call_hook('after_draw');
    test.deepEqual(max_depth(root), 3, 'detach_level = 3 wins over generation_on_subbranch_during_fly = 1');

  }).then(function () {
    test.end();
  }).catch(function (err) {
    console.log(err.stack);
    test.fail(err);
    test.end();
  })
});

test('clear_garbage: Undevelops the whole node, leaving it for develop_children() to rebuild', function (test) {
  return populate_factory().then((factory) => {
    with_gc_config(test, 1, 1);
    test.teardown(remove_gc_hooks);
    gc_init();
    let root = fresh_tree(factory, 4);

    call_hook('after_draw');
    test.deepEqual(developed_paths(root), ['root', '0', '1'], 'Everything below the 1st generation collected');

    // A collected node is emptied outright rather than having individual children
    // removed---the rest of the tree has no convention for a half-developed node
    let collected = root.children[0];
    test.deepEqual(collected.children, [], 'Collected node has no children at all');
    test.deepEqual(collected.has_child, false, 'so it now reports itself childless');
    test.deepEqual(collected.full_children_length, 2, 'but still knows how many it ought to have');

    // Repeated collection is a no-op, not an error
    call_hook('after_draw');
    test.deepEqual(developed_paths(root), ['root', '0', '1'], 'Still collected, without re-collecting anything');

    // The nodes come back when the tree needs them again
    collected.develop_children(0);
    test.deepEqual(developed_paths(root), ['root', '0', '0.0', '0.1', '1'], 'Children redeveloped');

  }).then(function () {
    test.end();
  }).catch(function (err) {
    console.log(err.stack);
    test.fail(err);
    test.end();
  })
});

test('clear_garbage: A dvar or targeted node protects the generation below it', function (test) {
  return populate_factory().then((factory) => {
    with_gc_config(test, 1, 1);
    test.teardown(remove_gc_hooks);
    gc_init();

    // Without anything drawn only the 1st generation survives (see above), but being
    // drawn restarts the count, buying that child's own children a reprieve.
    // NB: dvar propagates up to the root, so the root is drawn whenever a child is
    let root = fresh_tree(factory, 4);
    root.dvar = true;
    root.children[0].dvar = true;
    call_hook('after_draw');
    test.deepEqual(developed_paths(root), [
      'root',
      '0', '0.0', '0.1',
      '1',
    ], 'dvar: the drawn child kept a generation its sibling did not');

    // Being on the path to the current flight's destination does the same
    root = fresh_tree(factory, 4);
    root.targeted = true;
    root.children[0].targeted = true;
    call_hook('after_draw');
    test.deepEqual(developed_paths(root), [
      'root',
      '0', '0.0', '0.1',
      '1',
    ], 'targeted: the child being flown to kept a generation its sibling did not');

    // A root with nothing developed below it has nothing to collect, and doesn't error
    factory.build_tree();
    test.deepEqual(factory.root.has_child, false, 'Undeveloped root reports no children');
    call_hook('after_draw');
    test.deepEqual(developed_paths(factory.root), ['root'], 'Undeveloped root left alone');

  }).then(function () {
    test.end();
  }).catch(function (err) {
    console.log(err.stack);
    test.fail(err);
    test.end();
  })
});

test('clear_garbage: Collects out-of-reach nodes below a dvar node', function (test) {
  return populate_factory().then((factory) => {
    with_gc_config(test, 2, 2);
    test.teardown(remove_gc_hooks);
    gc_init();
    let root = fresh_tree(factory, 4);

    // The root is being drawn, so is 0 generations from the visible branch...
    root.dvar = true;
    // ...as is one of its children, but its sibling is out of reach
    root.children[0].dvar = true;

    call_hook('after_draw');
    test.deepEqual(developed_paths(root), [
      'root',
      '0', '0.0', '0.0.0', '0.0.1', '0.1', '0.1.0', '0.1.1',
      '1', '1.0', '1.1',
    ], 'Counting restarted at the drawn child, so it kept a generation its sibling did not');

  }).then(function () {
    test.end();
  }).catch(function (err) {
    console.log(err.stack);
    test.fail(err);
    test.end();
  })
});

test('clear_garbage: Walks into subtrees collected by a previous pass', function (test) {
  return populate_factory().then((factory) => {
    with_gc_config(test, 3, 3);
    test.teardown(remove_gc_hooks);
    gc_init();
    let root = fresh_tree(factory, 4);

    // Nothing is being drawn, so everything below the 3rd generation is collected
    call_hook('after_draw');
    test.deepEqual(max_depth(root), 3, 'Kept 3 generations below the root');

    // Now draw the tree. The count restarts at the drawn child, bringing the nodes we
    // just emptied back within reach---being childless, there is nothing left to collect
    root.dvar = true;
    root.children[0].dvar = true;
    call_hook('after_draw');
    test.deepEqual(max_depth(root), 3, 'Still 3 generations, walked back over without error');

  }).then(function () {
    test.end();
  }).catch(function (err) {
    console.log(err.stack);
    test.fail(err);
    test.end();
  })
});
