﻿import api = require("./fs-api");
import util = require("./util");

import IFilesystem = api.IFilesystem;
import IStats = api.IStats;
import IItem = api.IItem;
import FileType = api.FileType;

export interface IDataTarget {
    name?: string;

    on(event: 'drain', listener: () => void): NodeEventEmitter;
    on(event: 'error', listener: (err: Error) => void): NodeEventEmitter;
    on(event: 'finish', listener: () => void): NodeEventEmitter;
    on(event: string, listener: Function): NodeEventEmitter;

    write(chunk: NodeBuffer, callback?: () => void): boolean;
    end(): void;

    acceptsEmptyBlocks?: boolean;
}

export interface IDataSource {
    name: string;
    length: number;
    stats?: IStats;
    path?: string;
    relativePath?: string;

    on(event: 'readable', listener: () => void): NodeEventEmitter;
    on(event: 'error', listener: (err: Error) => void): NodeEventEmitter;
    on(event: 'end', listener: () => void): NodeEventEmitter;
    on(event: string, listener: Function): NodeEventEmitter;

    read(): NodeBuffer;
    close(): void;
}

export class Path {
    path: string;
    fs: IFilesystem;

    constructor(path: string, fs?: IFilesystem) {
        if (typeof path !== "string") path = "" + path;
        this.path = <string>path;
        this.fs = fs || null;
    }

    private _windows(): boolean {
        return this.fs && (<any>this.fs).isWindows && true;
    }

    isTop(): boolean {
        var path = this.path;
        if (path.length == 0 || path == '/') return true;
        if (this._windows()) {
            if (path == '\\') return true;
            if (path[1] != ':') return false;
            if (path.length == 2) return true;
            if (path.length == 3 && (path[2] == '/' || path[2] == '\\')) return true;
        }
        return false;
    }

    getName(): string {
        var path = this.path;
        var windows = this._windows();
        var n = path.lastIndexOf('/');
        if (n < 0 && windows) n = path.lastIndexOf('\\');
        if (n < 0) return path;
        return path.substr(n + 1);
    }

    getParent(): Path {
        var path = this.path;
        var windows = this._windows();
        var n = path.lastIndexOf('/');
        if (n < 0 && windows) n = path.lastIndexOf('\\');
        if (n < 0) {
            path = "";
        } else if (n == 0) {
            path = "/";
        } else {
            path = path.substr(0, n);
        }

        return new Path(path, this.fs);
    }

    startsWith(value: string) {
        if (value.length == 0) return false;
        var path = this.path;
        if (path.length < value.length) return false;
        if (value.length == 1) return path[0] === value;
        for (var i = 0; i < value.length; i++) {
            if (value[i] !== path[i]) return false;
        }
        return true;
    }

    endsWithSlash(): boolean {
        var last = this.path[this.path.length - 1];
        if (last == '/') return true;
        if (last == '\\' && this._windows()) return true;
        return false;
    }

    removeTrailingSlash(): Path {
        var path = this.path;
        var windows = this._windows();

        var len = path.length;
        if (len > 1) {
            var last = path[len - 1];
            if (last == '/' || (last == '\\' && windows)) path = path.substr(0, len - 1);
        }

        return new Path(path, this.fs);
    }

    normalize(): Path {
        var path = this.path;

        // replace slashes with backslashes with on Windows filesystems
        if (this._windows()) {
            path = path.replace(/\//g, "\\");
        } else {
            path = path.replace(/\\/g, "/");
        }

        return new Path(path, this.fs);
    }

    toString(): string {
        return this.path;
    }

    join(...paths: string[]): Path
    join(...paths: Path[]): Path
    join(...paths: any[]): Path {
        var path = "" + this.path;
        var windows = this._windows();

        (<string[]>paths).forEach(segment => {
            if (typeof segment === "undefined") return;
            segment = "" + segment;
            if (segment.length == 0) return;
            if (path.length == 0 || segment[0] === '/' || segment === "~" || (segment[0] === '~' && segment[1] === '/')) {
                path = segment;
                return;
            }

            if (windows) {
                if (segment[0] === '\\' || (segment[0] === '~' && segment[1] === '\\') || segment[1] === ':') {
                    path = segment;
                    return;
                }
            }

            var last = path[path.length - 1];
            if (last === '/' || (windows && last === '\\')) {
                path = path + segment;
            } else {
                path = path + "/" + segment;
            }
        });

        if (path.length == 0) {
            path = ".";
        } else if (windows) {
            path = path.replace(/\//g, '\\');
        }

        return new Path(path, this.fs);
    }

    static create(path: string, fs: IFilesystem, name?: string): Path {
        path = Path.check(path, name);
        return new Path(path, fs).normalize();
    }

    static check(path: string, name?: string): string {
        if (typeof name === "undefined") name = "path";

        if (typeof path !== "string") {
            if (path === null || typeof path === "undefined")
                throw new Error("Missing " + name);

            if (typeof path === 'function')
                throw new Error("Invalid " + name);

            path = "" + path;
        }

        if (path.length == 0)
            throw new Error("Empty " + name);

        return path;
    }
}

export class FileUtil {

    static isDirectory(stats: IStats): boolean {
        return stats ? (stats.mode & FileType.ALL) == FileType.DIRECTORY : false; // directory
    }

    static isFile(stats: IStats): boolean {
        return stats ? (stats.mode & FileType.ALL) == FileType.REGULAR_FILE : false; // regular file
    }

    static toString(filename: string, stats: IStats): string {
        var attrs = stats.mode;

        var perms;
        switch (attrs & FileType.ALL) {
            case FileType.CHARACTER_DEVICE:
                perms = "c";
                break;
            case FileType.DIRECTORY:
                perms = "d";
                break;
            case FileType.BLOCK_DEVICE:
                perms = "b";
                break;
            case FileType.REGULAR_FILE:
                perms = "-";
                break;
            case FileType.SYMLINK:
                perms = "l";
                break;
            case FileType.SOCKET:
                perms = "s";
                break;
            case FileType.FIFO:
                perms = "p";
                break;
            default:
                perms = "-";
                break;
        }

        attrs &= 0x1FF;

        for (var j = 0; j < 3; j++) {
            var mask = (attrs >> ((2 - j) * 3)) & 0x7;
            perms += (mask & 4) ? "r" : "-";
            perms += (mask & 2) ? "w" : "-";
            perms += (mask & 1) ? "x" : "-";
        }

        var len = stats.size.toString();
        if (len.length < 9)
            len = "         ".slice(len.length - 9) + len;
        else
            len = " " + len;

        var modified = stats.mtime;
        var diff = (new Date().getTime() - modified.getTime()) / (3600 * 24);
        var date = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][modified.getUTCMonth()];
        var day = modified.getUTCDate();
        date += ((day <= 9) ? "  " : " ") + day;

        if (diff < -30 || diff > 180)
            date += "  " + modified.getUTCFullYear();
        else
            date += " " + ("0" + modified.getUTCHours()).slice(-2) + ":" + ("0" + modified.getUTCMinutes()).slice(-2);

        var nlink = (typeof (<any>stats).nlink === 'undefined') ? 1 : (<any>stats).nlink;

        return perms + " " + nlink + " user group " + len + " " + date + " " + filename;
    }

    static mkdir(fs: IFilesystem, path: string, callback?: (err: Error) => any): void {
        fs.stat(path,(err, stats) => {
            if (!err) {
                if (FileUtil.isDirectory(stats)) return callback(null);
                return callback(new Error("Path is not a directory")); //TODO: better error
            }

            if ((<any>err).code != "ENOENT") return callback(err);

            fs.mkdir(path, null, callback);
        });
    }

    static copy(source: IDataSource, target: IDataTarget, emitter: NodeEventEmitter, callback?: (err: Error) => any): void {
        var empty = true;
        var writable = true;
        var eof = false;
        var done = false;
        var error = <Error>null;
        var total = 0;
        var item = <IItem>null;

        source.on("readable",() => {
            //console.log("readable");
            if (item == null) transferring();
            while (writable) {
                if (!copy()) break;
            }
        });

        source.on("end",() => {
            //console.log("ended");
            eof = true;
            if (empty && target.acceptsEmptyBlocks) target.write(new Buffer(0));
            target.end();
        });

        source.on("error", err => {
            //console.log("read error", err);
            error = error || err || new Error("Unspecified error");
            eof = true;
            target.end();
        });

        target.on("drain",() => {
            //console.log("drained");
            writable = true;
            do {
                if (!copy()) break;
            } while (writable);
        });

        target.on("finish",() => {
            //console.log("finished");
            if (item) emitter.emit("transferred", item);
            exit();
        });

        target.on("error", err => {
            //console.log("write error", err);
            error = error || err || new Error("Unspecified error");
            exit();
        });

        function transferring(): void {
            var name = source.name;
            if (typeof name === "undefined") name = "" + target.name;
            var path = source.relativePath;
            if (typeof path === "undefined") path = name;

            item = {
                filename: name,
                stats: source.stats || { size: source.length },
                path: path,
            };

            emitter.emit("transferring", item);
        }

        function copy(): boolean {
            var chunk = source.read();
            if (!chunk) return false;

            empty = false;
            writable = target.write(chunk,() => {
                // The fact that write requests might in theory be completed in different order
                // doesn't concern us much because a transferred byte is still a transferred byte
                // and it will all add up to proper number in the end.
                total += chunk.length;
                emitter.emit("progress", source.path, total, source.length);
            });

            return writable;
        }

        function exit(): void {
            if (!eof) return source.close();

            if (!done) {
                done = true;
                callback(error);
            }
        }
    }
}
