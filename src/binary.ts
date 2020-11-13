/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as core from "@actions/core";
import * as validUrl from 'valid-url';

import util from './util';

export interface BinaryFound {
  readonly found: true;
  readonly path: string;
}

export interface BinaryNotFound {
  readonly found: false;
  readonly reason?: string;
}

export type FindBinaryStatus = BinaryFound | BinaryNotFound;

export interface BinaryVersion {
  readonly version: string;
  readonly major: number;
  readonly minor?: number;
  readonly patch?: number;
}

///// Below parses the user's version input

export type BinaryDownloadType = 'url' | 'version' | 'latest';

export type BinaryTypeUrl = {
  readonly type: 'url';
  readonly url: string;
}

export type BinaryTypeVersion = {
  readonly type: 'version';
  readonly parsedVersion: BinaryVersion;
}

export type BinaryTypeLatest = {
  readonly type: 'latest';
}

function formatVersionSegment(segmentName: string, segment: string): number {
  if (segment.startsWith('.')) {
    segment = segment.substring(1, segment.length);
  }

  const asNum = Number(segment);
  if (isNaN(asNum)) {
    throw new Error(`Could not parse ${segmentName} segment "${segment}" as a Number.`);
  }

  return asNum;
}

export function stringToVersion(versionStr: string): BinaryTypeVersion {
  const regexVersion = new RegExp('v?([0-9]+)([.][0-9]+)?([.][0-9]+)?');

  const parseVersionResult = regexVersion.exec(versionStr);

  if (parseVersionResult == null) {
    throw new Error(`Failed to parse ${util.INPUT_OC_VERSION} input "${versionStr}". See the README for valid versions.`);
  }

  const majorStr = parseVersionResult[1];
  const minorStr = parseVersionResult[2];
  const patchStr = parseVersionResult[3];

  core.debug(`Version segments: major ${majorStr} minor ${minorStr} patch ${patchStr}`);

  const major = formatVersionSegment('major', majorStr);
  const minor = minorStr ? formatVersionSegment('minor', minorStr) : undefined;
  const patch = patchStr ? formatVersionSegment('patch', patchStr) : undefined;

  let version: string = major.toString();
  if (minor) {
    version += `.${minor}`;
  }
  if (patch) {
    version += `.${patch}`;
  }
  // core.info(`Version is ${version}`);

  if (parseVersionResult && parseVersionResult.length > 0) {
    return {
      type: 'version',
      parsedVersion: {
        version, major, minor, patch
      }
    };
  }

  throw new Error('Version is written in an unknown format');
}

export function getBinaryDownloadType(versionInput: string): BinaryTypeUrl | BinaryTypeVersion | BinaryTypeLatest {
  if (versionInput === 'latest') {
    return { type: 'latest' };
  }
  if (validUrl.isWebUri(versionInput)) {
    return { type: 'url', url: versionInput };
  }

  return stringToVersion(versionInput);
}
