from gluon import current
from gluon.contrib.markdown.markdown2 import Markdown

def markdown(text):
    if not hasattr(current, 'oz_markdown'):
        current.oz_markdown = Markdown(
            safe_mode="escape",
        )

    return current.oz_markdown.convert(text)

if __name__ == '__main__':
    import sys

    if current.globalenv['is_testing'] != True:
        raise RuntimeError("Do not run tests in production environments, ensure is_testing = True")
    suite = unittest.TestSuite()
    suite.addTest(unittest.makeSuite(TestEmbed))
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if not result.wasSuccessful():
        sys.exit(1)
