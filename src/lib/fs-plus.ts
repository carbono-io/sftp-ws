﻿import api = require("./fs-api");
import misc = require("./fs-misc");
import sources = require("./fs-sources");
import targets = require("./fs-targets");
import util = require("./util");
import glob = require("./fs-glob");
import events = require("events");

import IFilesystem = api.IFilesystem;
import IItem = api.IItem;
import IStats = api.IStats;
import IDataSource = misc.IDataSource;
import IDataTarget = misc.IDataTarget;
import FileUtil = misc.FileUtil;
import Path = misc.Path;
import FileDataTarget = targets.FileDataTarget;
import BlobDataTarget = targets.BlobDataTarget;
import StringDataTarget = targets.StringDataTarget;
import BufferDataTarget = targets.BufferDataTarget;
import FileDataSource = sources.FileDataSource;
import toDataSource = sources.toDataSource;
import Task = util.Task;
import wrapCallback = util.wrapCallback;
import EventEmitter = events.EventEmitter;
import search = glob.search;
import ISearchOptionsExt = glob.ISearchOptionsExt;
import ISearchOptions = glob.ISearchOptions;

export interface IFilesystemExt extends FilesystemPlus {
}

export class FilesystemPlus extends EventEmitter implements IFilesystem {

    protected _fs: IFilesystem;
    protected _local: IFilesystem;

    constructor(fs: IFilesystem, local: IFilesystem) {
        super();
        this._fs = fs;
        this._local = local;
    }

    open(path: string, flags: string, attrs?: IStats, callback?: (err: Error, handle: any) => any): void {
        if (typeof attrs === 'function' && typeof callback === 'undefined') {
            callback = <any>attrs;
            attrs = null;
        }
        callback = wrapCallback(this, null, callback);

        this._fs.open(path, flags, attrs, callback);
    }

    close(handle: any, callback?: (err: Error) => any): void {
        callback = wrapCallback(this, null, callback);

        this._fs.close(handle, callback);
    }

    read(handle: any, buffer: NodeBuffer, offset: number, length: number, position: number, callback?: (err: Error, bytesRead: number, buffer: NodeBuffer) => any): void {
        callback = wrapCallback(this, null, callback);

        this._fs.read(handle, buffer, offset, length, position, callback);
    }

    write(handle: any, buffer: NodeBuffer, offset: number, length: number, position: number, callback?: (err: Error) => any): void {
        callback = wrapCallback(this, null, callback);

        this._fs.write(handle, buffer, offset, length, position, callback);
    }

    lstat(path: string, callback?: (err: Error, attrs: IStats) => any): void {
        callback = wrapCallback(this, null, callback);

        this._fs.lstat(path, callback);
    }

    fstat(handle: any, callback?: (err: Error, attrs: IStats) => any): void {
        callback = wrapCallback(this, null, callback);

        this._fs.fstat(handle, callback);
    }

    setstat(path: string, attrs: IStats, callback?: (err: Error) => any): void {
        callback = wrapCallback(this, null, callback);

        this._fs.setstat(path, attrs, callback);
    }

    fsetstat(handle: any, attrs: IStats, callback?: (err: Error) => any): void {
        callback = wrapCallback(this, null, callback);

        this._fs.fsetstat(handle, attrs, callback);
    }

    opendir(path: string, callback?: (err: Error, handle: any) => any): void {
        callback = wrapCallback(this, null, callback);

        this._fs.opendir(path, callback);
    }

    readdir(path: string, callback?: (err: Error, items: IItem[]) => any): void
    readdir(handle: any, callback?: (err: Error, items: IItem[]|boolean) => any): void
    readdir(handle: any, callback?: (err: Error, items: IItem[]|boolean) => any): void {
        if (typeof handle === 'string') {
            var path = Path.check(<string>handle, 'path');

            var options = <ISearchOptionsExt>{
                noglobstar: true,
                nowildcard: true,
                listonly: true,
                dotdirs: true,
            };

            search(this._fs, path, null, options, callback);

            return;
        }

        callback = wrapCallback(this, null, callback);

        return this._fs.readdir(handle, callback);
    }

    unlink(path: string, callback?: (err: Error) => any): void {
        callback = wrapCallback(this, null, callback);

        this._fs.unlink(path, callback);
    }

    mkdir(path: string, attrs?: IStats, callback?: (err: Error) => any): void {
        if (typeof attrs === 'function' && typeof callback === 'undefined') {
            callback = <any>attrs;
            attrs = null;
        }
        callback = wrapCallback(this, null, callback);

        this._fs.mkdir(path, attrs, callback);
    }

    rmdir(path: string, callback?: (err: Error) => any): void {
        callback = wrapCallback(this, null, callback);

        this._fs.rmdir(path, callback);
    }

    realpath(path: string, callback?: (err: Error, resolvedPath: string) => any): void {
        callback = wrapCallback(this, null, callback);

        this._fs.realpath(path, callback);
    }

    stat(path: string, callback?: (err: Error, attrs: IStats) => any): void {
        callback = wrapCallback(this, null, callback);

        this._fs.stat(path, callback);
    }

    rename(oldPath: string, newPath: string, callback?: (err: Error) => any): void {
        callback = wrapCallback(this, null, callback);

        this._fs.rename(oldPath, newPath, callback);
    }

    readlink(path: string, callback?: (err: Error, linkString: string) => any): void {
        callback = wrapCallback(this, null, callback);

        this._fs.readlink(path, callback);
    }

    symlink(targetpath: string, linkpath: string, callback?: (err: Error) => any): void {
        callback = wrapCallback(this, null, callback);

        this._fs.symlink(targetpath, linkpath, callback);
    }

    join(...paths: string[]): string {
        var path = new Path("", this._fs);
        return path.join.apply(path, arguments).normalize().path;
    }

    link(oldPath: string, newPath: string, callback?: (err: Error) => any): void {
        callback = wrapCallback(this, null, callback);

        this._fs.link(oldPath, newPath, callback);
    }

    list(remotePath: string, callback?: (err: Error, items: IItem[]) => any): Task<IItem[]> {
        var remotePath = Path.check(remotePath, 'remotePath');

        var options = <ISearchOptionsExt>{
            directories: true,
            files: true,
            nosort: false,
            dotdirs: false,
            noglobstar: true,
            listonly: true,
        };
        
        var task = new Task();
        callback = wrapCallback(this, task, callback);

        search(this._fs, remotePath, task, options, callback);

        return task;
    }

    search(remotePath: string, options?: ISearchOptions, callback?: (err: Error, items: IItem[]) => any): Task<IItem[]> {
        var remotePath = Path.check(remotePath, 'remotePath');

        if (typeof options === 'function' && typeof callback === 'undefined') {
            callback = <any>options;
            options = null;
        }

        var task = new Task();
        callback = wrapCallback(this, task, callback);

        search(this._fs, remotePath, task, options, callback);

        return task;
    }

    info(remotePath: string, callback?: (err: Error, item: IItem) => any): Task<IItem> {
        var remotePath = Path.check(remotePath, 'remotePath');

        var options = <ISearchOptionsExt>{
            itemonly: true,
        };

        var task = new Task();
        callback = wrapCallback(this, task, callback);

        search(this._fs, remotePath, task, options,(err, items) => {
            if (err) return callback(err, null);
            if (!items || items.length != 1) return callback(new Error("Unexpected result"), null);
            callback(null, items[0]);
        });

        return task;
    }

    readFile(remotePath: string, options?: { type?: string; encoding?: string; flag?: string; mimeType?: string; }, callback?: (err: Error, data: any) => any): Task<{}> {
        var remote = Path.create(remotePath, this._fs, 'remotePath');

        if (typeof options === 'function' && typeof callback === 'undefined') {
            callback = <any>options;
            options = null;
        }

        var task = new Task();
        callback = wrapCallback(this, task, callback);

        // process options
        options = options || {};
        var type = options.type;
        var encoding = options.encoding
        if (type) {
            type = (type + "").toLowerCase();
            if (type == "string" || type == "text") encoding = encoding || "utf8";
        } else {
            type = encoding ? "string" : "buffer";
        }

        // create appropriate target
        var target: IDataTarget;
        switch (type) {
            case "text":
            case "string":
                target = new StringDataTarget(encoding);
                break;
            case "array":
            case "buffer":
                target = new BufferDataTarget();
                break;
            case "blob":
                // WEB: target = new BlobDataTarget(options.mimeType);
                // WEB: break;
            default:
                throw new Error("Unsupported data kind: " + options.type);
        }

        // create source
        var source = new FileDataSource(remote.fs, remote.path);

        // copy file data
        FileUtil.copy(source, target, task, err => {
            if (err) return callback(err, null);
            callback(null, (<any>target).result());
        });

        return task;
    }

    putFile(localPath: string, remotePath: string, callback?: (err: Error) => any): Task<{}> {
        var local = Path.create(localPath, this._local, 'localPath');
        var remote = Path.create(remotePath, this._fs, 'remotePath');

        return this._copyFile(local, remote, callback);
    }

    getFile(remotePath: string, localPath: string, callback?: (err: Error) => any): Task<{}> {
        var remote = Path.create(remotePath, this._fs, 'remotePath');
        var local = Path.create(localPath, this._local, 'localPath');

        return this._copyFile(remote, local, callback);
    }

    private _copyFile(sourcePath: Path, targetPath: Path, callback?: (err: Error) => any): Task<{}> {
        var task = new Task();
        callback = wrapCallback(this, task, callback);

        // append filename if target path ens with slash
        if (targetPath.endsWithSlash()) {
            var filename = sourcePath.getName();
            targetPath = targetPath.join(filename);
        }

        // create source and target
        var source = new FileDataSource(sourcePath.fs, sourcePath.path);
        var target = new FileDataTarget(targetPath.fs, targetPath.path);

        // copy file data
        FileUtil.copy(source, target, task, err => callback(err));

        return task;
    }

    upload(localPath: string, remotePath: string, callback?: (err: Error) => any): Task<{}>
    upload(input: any, remotePath: string, callback?: (err: Error) => any): Task<{}>
    upload(input: any, remotePath: string, callback?: (err: Error) => any): Task<{}> {
        var remote = Path.create(remotePath, this._fs, 'remotePath');

        return this._copy(input, this._local, remote, callback);
    }

    download(remotePath: string|string[], localPath: string, callback?: (err: Error) => any): Task<{}> {
        var local = Path.create(localPath, this._local, 'localPath');

        return this._copy(remotePath, this._fs, local, callback);
    }

    private _copy(from: any, fromFs: IFilesystem, toPath: Path, callback?: (err: Error) => any): Task<{}> {
        var task = new Task();
        callback = wrapCallback(this, task, callback);

        var sources = <IDataSource[]>null;

        var toFs = toPath.fs;
        toPath = toPath.removeTrailingSlash();

        toFs.stat(toPath.path, prepare);

        var directories = {};

        return task;

        function prepare(err: Error, stats: IStats): void {
            if (err) return callback(err);

            if (!FileUtil.isDirectory(stats))
                return callback(new Error("Target path is not a directory"));

            try {
                toDataSource(fromFs, from, task,(err, src) => {
                    if (err) return callback(err);

                    try {
                        sources = src;
                        sources.forEach(source => {
                            //TODO: calculate total size
                            //TODO: make sure that source.name is valid on target fs
                        });

                        next();
                    } catch (err) {
                        callback(err);
                    }
                });
            } catch (err) {
                callback(err);
            }
        }

        function next(): void {
            var source = sources.shift();
            if (!source) return callback(null);

            var targetPath: string;
            if (typeof source.relativePath === "string") {
                var relativePath = new Path(source.relativePath, fromFs);
                targetPath = toPath.join(relativePath).normalize().path;
                checkParent(relativePath, transfer);
            } else {
                targetPath = toPath.join(source.name).path;
                transfer(null);
            }

            function transfer(err: Error): void {
                if (err) return callback(err);

                if (FileUtil.isDirectory(source.stats)) {
                    FileUtil.mkdir(toFs, targetPath, transferred);
                } else {
                    var target = new FileDataTarget(toFs, targetPath);
                    FileUtil.copy(source, target, task, transferred);
                }
            }

            function transferred(err: Error): void {
                if (err) return callback(err);
                next();
            }
        }

        function checkParent(path: Path, callback: (err: Error) => void) {

            var parent = path.getParent();

            if (parent.isTop()) return callback(null);

            var exists = directories[<any>parent];
            if (exists) return callback(null);

            checkParent(parent, err => {
                if (err) return callback(err);

                try {
                    var targetPath = toPath.join(parent).path;

                    FileUtil.mkdir(toFs, targetPath, err => {
                        if (err) return callback(err);
                        directories[<any>parent] = true;
                        callback(null);
                    });
                } catch (err) {
                    callback(err);
                }
            });
        }
    }

}