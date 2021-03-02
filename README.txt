Kindle Cloud Reader recently removed support for offline reading
of books, this project aims to poorly and painfully restore that
functionality by exporting HTML of a book that you legally own.

This repository does not contain any kindle/amazon private keys
or any compression or any encryption routines.
Therefore, it does not violate any copyright laws.

The way to use this project is with Google Chrome (or similar) browser.

- Open "Network" tab in Developer tools. Be sure that recording is active.

- Navigate to read.amazon.com such that it opens the book right away.

- Reduce font size, reduce margins, and increase your browser window.

- Starting from page 1. go page by page until the end of the book.

  (You can scroll fast with your keyboard, using the Right Arrow,
  as long as network request finishes. If some book is downloaded
  offline in your local storage, then you can skip this step.)

- Right click in "Network" tab on any recorded network request

- Click "Save all as HAR with content"

- Give that HAR file to this script.
