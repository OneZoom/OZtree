/**
  * Usage: npx babel-tape-runner OZprivate/rawJS/OZTreeModule/tests/test_projection_highlight.js
  */
import { resolve_pinpoints } from '../src/navigation/pinpoint.js';
import { resolve_highlights, current_highlights, highlight_update, highlights_for } from '../src/projection/highlight/highlight.js';
import { populate_data_repo, get_ozid } from './util_data_repo.js'
import { populate_factory } from './util_factory'
import test from 'tape';

function fake_picker(x) {
  // Named colours are only valid if integer
  if (typeof x === 'string') return (isFinite(parseInt(x, 10)) ? 'color(' + x + ')' : undefined);
  return x.map((str) => str.replace(/.*:/, '')).join(",") + ":" + x.length;
}

function test_highlights_for(test, node, highlight_strs) {
  test.deepEqual(
    highlights_for(node).map((h) => h.str),
    highlight_strs,
    "Highlights at " + node.ozid + (node.latin_name ? ' / ' + node.latin_name : '') + (node.cname ? ' / ' + node.cname : '') + (node.ott ? ' / ' + node.ott : ''),
  );
}

test('resolve_highlights', function (test) {
  return populate_data_repo().then(() => {
    // Resolve nothing, get nothing
    return resolve_highlights([], fake_picker).then((highlights) => test.deepEqual(highlights, [
    ]));

  }).then(function () {
    // Can pass in strings or objects, colours preserved if already present
    return resolve_highlights([
      'fan:@_ozid=1',
      { str: 'fan:@_ozid=2', color: 'custom' },
      { str: 'fan:@_ozid=3', ozids: [9999] },
      'fan:@_ozid=4',
    ], fake_picker).then((highlights) => test.deepEqual(highlights, [
      // NB: Custom colour handed in as existing before that highlight has been processed
      { str: 'fan:@_ozid=1', type: 'fan', color: 'custom:1', pinpoints: [ '@_ozid=1' ], ozids: [ 1 ] },
      { str: 'fan:@_ozid=2', type: 'fan', color: 'custom', pinpoints: [ '@_ozid=2' ], ozids: [ 2 ] },
      // NB: Existing ozid used in prefrence to resolving pinpoint again
      { str: 'fan:@_ozid=3', type: 'fan', color: '1,custom:2', pinpoints: [ '@_ozid=3' ], ozids: [ 9999 ] },
      { str: 'fan:@_ozid=4', type: 'fan', color: '1,custom,2:3', pinpoints: [ '@_ozid=4' ], ozids: [ 4 ] },
    ]));

  }).then(function () {
    // Path highlights default to starting at root node
    return resolve_highlights([
      'path:@_ozid=1234',
      'path:@_ozid=123@_ozid=456',
    ], fake_picker).then((highlights) => test.deepEqual(highlights, [
      { str: 'path:@_ozid=1234', type: 'path', color: ':0', pinpoints: [ '@_ozid=1', '@_ozid=1234' ], ozids: [ 1, 1234 ] },
      { str: 'path:@_ozid=123@_ozid=456', type: 'path', color: '0:1', pinpoints: [ '@_ozid=123', '@_ozid=456' ], ozids: [ 123, 456 ] },
    ]));

  }).then(function () {
    // Pick colours out of highlight
    return resolve_highlights([
      'path:blue@_ozid=1234',
      'fan:pink@_ozid=123',
      'fan:4@_ozid=9090',
    ], fake_picker).then((highlights) => test.deepEqual(highlights, [
      { str: 'path:blue@_ozid=1234', type: 'path', color: 'blue', pinpoints: [ '@_ozid=1', '@_ozid=1234' ], ozids: [ 1, 1234 ] },
      { str: 'fan:pink@_ozid=123', type: 'fan', color: 'pink', pinpoints: [ '@_ozid=123' ], ozids: [ 123 ] },
      { str: 'fan:4@_ozid=9090', type: 'fan', color: 'color(4)', pinpoints: [ '@_ozid=9090' ], ozids: [ 9090 ] },
    ]));

  }).then(function () {
    test.end();
  }).catch(function (err) {
    console.log(err.stack);
    test.fail(err);
    test.end();
  })
});

test('update_highlights', function (test) {
  var nodes = {};

  return populate_factory().then((factory) => {
    // Gather some test points
    return resolve_pinpoints([
      '@biota=93302',
      '@mammalia=244265',
      '@chiroptera=574724',  // All bats
      '@peropodidae=574742',  // Megabats
      '@dobsonia=988790',  // Bare-backed fruit bats
      '@dobsonia_moluccensis=1032365',
      '@dobsonia_crenulata=3613457',
      '@acerodon=635024', // Flying foxes
      '@pteropus=813030', // Flying foxes
      '@pteropus_vampyrus=448935',
      '@pteropus_lylei=630309',
    ]).then((pps) => pps.forEach((pp) => {
        nodes[pp.latin_name] = factory.dynamic_loading_by_metacode(pp.ozid)
    }));

  }).then(function () {
    // No highlights, nothing highlighted
    return resolve_highlights([
    ], fake_picker).then((hs) => highlight_update(nodes.biota, hs)).then(() => {
      test.deepEqual(current_highlights(), []);
      test_highlights_for(test, nodes.biota, []);
      test_highlights_for(test, nodes.mammalia, []);
    });

  }).then(function () {
    return resolve_highlights([
      'path:@pteropus=813030@pteropus_vampyrus=448935',
      'path:@pteropus_vampyrus=448935',
      'fan:@chiroptera=574724@pteropus=813030',
      'path:@acerodon=635024',
    ], fake_picker).then((hs) => highlight_update(nodes.biota, hs)).then(() => {
      test.deepEqual(current_highlights().map((h) => h.str), [
        'path:@pteropus=813030@pteropus_vampyrus=448935',
        'path:@pteropus_vampyrus=448935',
        'fan:@chiroptera=574724@pteropus=813030',
        'path:@acerodon=635024',
      ]);
      test_highlights_for(test, nodes.biota, [
        'path:@pteropus_vampyrus=448935',
        'path:@acerodon=635024',
      ]);
      test_highlights_for(test, nodes.chiroptera, [
        'path:@pteropus_vampyrus=448935',
        // NB: Fan not active yet
        'path:@acerodon=635024',
      ]);
      test_highlights_for(test, nodes.chiroptera.children[0], [
        'path:@pteropus_vampyrus=448935',
        // Now fan is active
        'fan:@chiroptera=574724@pteropus=813030',
        'path:@acerodon=635024',
      ]);
      test_highlights_for(test, nodes.chiroptera.children[1], [
        // ... on both paths
        'fan:@chiroptera=574724@pteropus=813030',
      ]);
      test_highlights_for(test, nodes.acerodon, [
        'fan:@chiroptera=574724@pteropus=813030',
        'path:@acerodon=635024',
      ]);
      test_highlights_for(test, nodes['dobsonia moluccensis'], [
        'fan:@chiroptera=574724@pteropus=813030',
      ]);
      test_highlights_for(test, nodes.pteropus, [
        // NB: Path from here not active
        'path:@pteropus_vampyrus=448935',
      ]);
      test_highlights_for(test, nodes.pteropus.children[1], [
        // NB: Now it is NB(2): The order of our highlights has been preserved
        'path:@pteropus=813030@pteropus_vampyrus=448935',
        'path:@pteropus_vampyrus=448935',
      ]);
      test_highlights_for(test, nodes['pteropus vampyrus'], [
        'path:@pteropus=813030@pteropus_vampyrus=448935',
        'path:@pteropus_vampyrus=448935',
      ]);
    });

  }).then(function () {
    test.end();
  }).catch(function (err) {
    console.log(err.stack);
    test.fail(err);
    test.end();
  })
});


test('highlights_for', function (test) {
  var nodes = {};

  return populate_factory().then((factory) => {
    // Gather some test points
    return resolve_pinpoints([
      '@biota=93302',
    ]).then((pps) => pps.forEach((pp) => {
        nodes[pp.latin_name] = factory.dynamic_loading_by_metacode(pp.ozid)
    }));

  }).then(function () {
    return resolve_highlights([
      'path:rgb(1)@dobsonia_moluccensis=1032365',
      'path:rgb(1)@pteropus=813030',
      'path:rgb(1)@acerodon=635024',
      'path:rgb(2)@pteropus_vampyrus=448935',
      'path:rgb(3)@chiroptera=574724',
      'path:rgb(2)@pteropus_lylei=630309',
    ], fake_picker).then((hs) => highlight_update(nodes.biota, hs)).then(() => {
      function hf(highlight_status) {
        return highlights_for({ highlight_status: highlight_status.split("") }).map((h) => h.str);
      }

      test.deepEqual(hf('aaaaaa'), [
        'path:rgb(1)@dobsonia_moluccensis=1032365',
        'path:rgb(2)@pteropus_vampyrus=448935',
        'path:rgb(3)@chiroptera=574724',
        'path:rgb(2)@pteropus_lylei=630309',
      ], "All colours active, second/third entry not included as colour matches");

      test.deepEqual(hf('paappp'), [
        'path:rgb(1)@pteropus=813030',
      ], "Disable first, second present but not third");

      test.deepEqual(hf('ppaaaa'), [
        'path:rgb(1)@acerodon=635024',
        'path:rgb(2)@pteropus_vampyrus=448935',
        'path:rgb(3)@chiroptera=574724',
        'path:rgb(2)@pteropus_lylei=630309',
      ], "Disable first/second, third present");

      // NB: I don't think this is ideal behaviour, ideally we'd consider these different
      //     but the logic to do that is too complicated for a hot path such as this.
      test.deepEqual(hf('ppaapa'), [
        'path:rgb(1)@acerodon=635024',
        'path:rgb(2)@pteropus_vampyrus=448935',
      ], "Disable rgb(3), collapse non-consecutive rgb(2)'s");
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
  // NB: Something data_repo includes in is holding node open.
  //     Can't find it so force our tests to end.
  process.exit(0)
});
