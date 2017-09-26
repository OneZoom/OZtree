### Detail Updater

This module fetches node or leaf details from server and update node or leaf properties afterwards.(?update node or leaf properties might be factories's work or maybe not)

Module Interface

  1. constructor
    * start fetching cycle. Fetch node details 1 time per second if there are no remaining nodes or leaves waiting in the fetching queue, otherwise fetch 5 times per second.