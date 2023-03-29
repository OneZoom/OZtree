/**
  * Usage: npx babel-tape-runner OZprivate/rawJS/OZTreeModule/tests/test_factory_factory.js
  */
import { get_ozid } from './util_data_repo'
import { populate_factory } from './util_factory'
import test from 'tape';

test('dynamic_loading_by_metacode', function (test) {
  var factory;

  return populate_factory().then((f) => {
    // Init data_repo & factory
    factory = f;

 }).then(() => {
    // Interior node
    var ozid = get_ozid({node: true})
    var node = factory.dynamic_loading_by_metacode(ozid);
    test.deepEqual(node.metacode, ozid)
    test.deepEqual(node.type, 'interiorNode')

 }).then(() => {
    // Leaf node
    var ozid = get_ozid({leaf: true})
    var node = factory.dynamic_loading_by_metacode(ozid);
    test.deepEqual(node.metacode, -ozid)
    test.deepEqual(node.type, 'leafNode')

 }).then(() => {
    // Nonexistant node
    var ozid = get_ozid({nonexistant: true})
    test.throws(() => {
      var node = factory.dynamic_loading_by_metacode(ozid);
    }, ozid);

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
