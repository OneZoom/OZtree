from gluon import current
from gluon.contrib.markdown.markdown2 import Markdown

def markdown(text):
    if not hasattr(current, 'oz_markdown'):
        current.oz_markdown = Markdown(
            safe_mode="escape",
        )

    return current.oz_markdown.convert(text)
