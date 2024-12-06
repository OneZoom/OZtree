import test from 'tape';
import search_manager from '../src/ui/search_manager';

test('search_manager', function (t) {
    t.ok(search_manager);
    t.ok(search_manager.compile_searchbox_data);
    const cols = {
        "vernacular": 0,
        "name": 1,
        "ott": 2,
        "extra_vernaculars": 3,
        "id": 4,
    }
    let result;
    // With latin name
    result = search_manager.compile_searchbox_data("", "en", [
        "Test case",
        "Testicus Casicus",
        null,
        [],
        12345,
    ], cols, false);
    t.deepEqual(result.pinpoint, "@Testicus_Casicus", "Can use latin name as pinpoint when no ott");
    
    // Fake latin name - prefix
    result = search_manager.compile_searchbox_data("", "en", [
        "Test case",
        "_Testicus Casicus",
        null,
        [],
        12345,
    ], cols, false);
    t.deepEqual(result.pinpoint, "@_ozid=12345", "Ignores fake latin name with underscore prefix when no ott");

    // Fake latin name - suffix
    result = search_manager.compile_searchbox_data("", "en", [
        "Test case",
        "Testicus Casicus_",
        null,
        [],
        12345,
    ], cols, false);
    t.deepEqual(result.pinpoint, "@_ozid=12345", "Ignores fake latin name with underscore suffix when no ott");
    t.end();
});
