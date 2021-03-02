#!/usr/bin/env node

'use strict';

const homedir = require('os').homedir();
const assert = require('assert').strict;
const fs = require('fs');
const print = console.log;
var sqlite3 = require('sqlite3').verbose();
var sqlite = require('sqlite');


// This is for Mac OS X, on your OS you might need a different path, patches welcome
const PATH = homedir + '/Library/Application Support/Google/Chrome/Default/databases/https_read.amazon.com_0'


class EBookCreator {
    constructor(asin) {
        this.asin = asin;
        this.fragments = {};
        this.skeletons = {};
        this.fileRe = new RegExp('^\\w+\\((.*)\\);\\s*$');
        const goto = 'KindleContentInterface.gotoPosition';
        this.gotoRe = new RegExp('href="#" onclick="' + goto + '\\([0-9]+,([0-9]+)\\); return false;"', 'g');
    }

    decrypt(data) {
        assert(KindleO_Aaa.o_aad);
        return KindleO_Aaa.o_aad(data, this.decryption_key);
    }

    decompress(data) {
        assert(KindleCompression.lzExpandWithStaticDictionary);
        return KindleCompression.lzExpandWithStaticDictionary(data, this.ca_dictionary);
    }

    jsonp(fname, cont) {
        const mFile = cont.match(this.fileRe);
        const obj = JSON.parse(mFile[1]);

        if (obj.fragmentData && obj.fragmentMetadata) {
            const id = obj['fragmentMetadata']['id'];
            let data = obj['fragmentData'];
            if (obj.fragmentMetadata.encryption) {
                data = this.decrypt(data);
            }
            if (obj.fragmentMetadata.compression) {
                data = this.decompress(data);
            }

            let processed = data;
            if (obj.imageData) {
                for (const iname in obj.imageData) {
                    processed = processed.replace(
                        'dataUrl="' + iname + '"',
                        'src="' + obj.imageData[iname] + '"'
                    );
                }
            }

            processed = processed.replace(this.gotoRe, function(_, id) {
                return 'href="#' + id + '"';
            });

            this.fragments[id] = { original: data, processed: processed };
        }

        if (obj.skeletonData && obj.skeletonMetadata) {
            const id = obj['skeletonMetadata']['id'];
            let data = obj['skeletonData'];
            if (obj.skeletonMetadata.encryption) {
                data = this.decrypt(data);
            }
            if (obj.skeletonMetadata.compression) {
                data = this.decompress(data);
            }
            this.skeletons[id] = { original: data };
        }
    }

    dumpHtml(htmlFile) {
        const css = [
            '.font-size-7 { font-size: 79.2px !important; }',
            '.font-size-6 { font-size: 70.4px !important; }',
            '.font-size-5 { font-size: 61.6px !important; }',
            '.font-size-4 { font-size: 52.8px !important; }',
            '.font-size-3 { font-size: 44px !important; }',
            '.font-size-2 { font-size: 33px !important; }',
            '.font-size-1 { font-size: 22px !important; }',
            'font { font-size: 44px !important; }',
            'body { font-size: 44px !important; }',
            'body.amzUserPref { font-size: 44px !important; }',
        ]

        var HtmlHeader = '<html><head>' +
            '<title>' + this.metadata.title + '</title>' +
            '<style>\n' + css.join('\n') + '\n</style>' +
            '<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">' +
            '</head><body id="' + this.asin + '">\n\n';

        const num_frags = this.fragmap.fragmentMetadata.numberOfFragments;
        fs.writeFileSync(htmlFile, HtmlHeader);
        for (let i = 0 ; i < num_frags; i++) {
            assert(this.fragments[i]);
            fs.appendFileSync(htmlFile, this.fragments[i].processed + '\n\n');
        }
        fs.appendFileSync(htmlFile, '</body></html>');
    }
}


// Extract relevant bits from chrome HAR file
function open_chrome_browser_har_file(fname) {
    const obj = JSON.parse(fs.readFileSync(fname)).log;
    let output = {}
    assert(obj.pages.length === 1, "Expected to see just a single page load, aborting to avoid mixing multiple books");
    assert(obj.pages[0].title.includes('//read.amazon.com/'), "Expected to see a page load or read.amazon.com");
    let non_unique_files = new Set();
    let files = {};
    for (const entry of obj.entries) {
        let fname = entry.request.url.split('?', 1)[0]
        const cont = entry.response.content.text;
        if (fname.length > 0 && cont && cont.length > 0) {
            if (files[fname]) {
                if (cont !== files[fname]) {
                    non_unique_files.add(fname);
                }
            } else {
                files[fname] = cont;
            }
        }
        for (var q of entry.request.queryString) {
            if (q.name === 'asin') {
                output.asin = q.value;
            }
        }
    }
    for (let fname of non_unique_files) {
        delete files[fname];
    }
    output.files = files;
    return output;
}


function getCompressionDictionary(metadata) {
    assert(KindleCompression);
    var map = {};

    if (metadata.cpr) {
        KindleCompression.lzAddStringsToDictionary(metadata.cpr, map),
        KindleCompression.lzAddNumbersToDictionary(map);
        return KindleCompression.lzGetDecompressionDictionary(map);
    }

    if (metadata.cprJson) {
        KindleCompression.lzAddStringsToDictionary(metadata.cprJson, map, 256),
        KindleCompression.lzAddNumbersToDictionary(map, 256);
        return KindleCompression.lzGetDecompressionDictionary(map);
    }
}


if (process.argv.length !== 3) {
    print("Usage: " + process.argv.slice(0, 2).join(' ') + " file.HAR" );
    process.exit(1);
}


const har = open_chrome_browser_har_file(process.argv[2]);

// Extract kindle compression and encryption routines from source code
for (let fname in har.files) {
    if (fname.endsWith('.js')) {
        const cont = har.files[fname];
        // Relevant code for compression should be between these two sections
        const b1 = cont.indexOf('KindleCompression=');
        const b2 = cont.indexOf('ContentMigration=');
        if (b1 !== -1 && b2 !== -1 && b1 < b2) {
            const code = cont.slice(b1, b2).replace(new RegExp('[,\\s]+$'), '');
            eval('global.' + code);
        }

        // Relevant code for decoding should be between these two sections
        const c1 = cont.indexOf('KindleO_Aaa=');
        const c2 = cont.indexOf('KindleAppDb=');
        if (c1 !== -1 && c2 !== -1 && c1 < c2) {
            const code = cont.slice(c1, c2).replace(new RegExp('[,\\s]+$'), '');
            eval('global.' + code);
        }
    }
}
assert(KindleO_Aaa, "failed to load encryption routine from .HAR file")
assert(KindleCompression, "failed to load compression routine from .HAR file");


const book = new EBookCreator(har.asin, har.title);

// Extract decryption key from HAR files
for (let fname in har.files) {
    if (fname.endsWith('/startReading')) {
        const startReading = JSON.parse(har.files[fname]);
        // This is kind of weird decision by amazon, but I guess it works
        book.decryption_key = startReading.contentChecksum;
    }
}


async function try_sqlite_database(dbfile) {
    const db = await sqlite.open({
      filename: PATH + '/' + dbfile,
      driver: sqlite3.cached.Database
    })

    let exists = await db.get('SELECT name FROM sqlite_master WHERE type="table" AND name="bookinfo"');
    if (!exists) {
        return;
    }

    let bookinfo = await db.get("select metadata, fragmap from 'bookinfo' where asin = '" + book.asin + "'");
    book.metadata = JSON.parse(bookinfo.metadata);
    book.fragmap = JSON.parse(bookinfo.fragmap);
    book.ca_dictionary = getCompressionDictionary(book.metadata);

    for (let fname in har.files) {
        if (fname.endsWith('.jsonp')) {
            book.jsonp(fname, har.files[fname]);
        }
    }
    const outputName = book.metadata.title.replace(/\:|\s+|\|/g, '-');
    book.dumpHtml(outputName + '.html')
}

// Chrome may have multiple sqlite files, we will try each one of them
fs.readdir(PATH, function(err, items) {
    for (const dbfile of items) {
        try_sqlite_database(dbfile);
    }
});