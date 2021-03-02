Kindle Cloud Reader recently removed support for offline reading
of books, this project aims to poorly and painfully restore that
functionality by exporting HTML of a book that you legaly own.

This repo does not contain any kindle/amazon private keys or
any compression or any encryption routines.
Therefore, it does not violate any copyright laws.

The way to use this project is with Google Chrome (or similar) browser.

- Open "Network" tab on Developer tools.

- Navigate to read.amazon.com such that it opens the book right away.

- Reduce font size, reduce margins, and increase your browser window.

- Starting from page 1. go page by page until the end of the book.

- Right click in "Network" tab on any recorded network request

- Click "Save all as HAR with content"

- Give that HAR file to this script.
