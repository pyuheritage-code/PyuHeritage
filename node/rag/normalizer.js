const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RESOURCES_DIR = path.join(__dirname, 'resources');
const MODEL_FILE = path.join(RESOURCES_DIR, 'zawgyiUnicodeModel.dat');
const Z2U_RULES_FILE = path.join(RESOURCES_DIR, 'Z2U.js');

// ---------------------------------------------------------------------------
// Zawgyi detector — port of Google myanmar-tools ZawgyiUnicodeMarkovModel
// (Apache-2.0). Uses the serialized bigram model shipped as
// resources/zawgyiUnicodeModel.dat.
// ---------------------------------------------------------------------------

const STD_CP0 = 0x1000, STD_CP1 = 0x103F;
const AFT_CP0 = 0x104A, AFT_CP1 = 0x109F;
const EXA_CP0 = 0xAA60, EXA_CP1 = 0xAA7F;
const EXB_CP0 = 0xA9E0, EXB_CP1 = 0xA9FF;
const SPC_CP0 = 0x2000, SPC_CP1 = 0x200B;

const STD_OFFSET = 1;
const AFT_OFFSET = STD_OFFSET + STD_CP1 - STD_CP0 + 1;
const EXA_OFFSET = AFT_OFFSET + AFT_CP1 - AFT_CP0 + 1;
const EXB_OFFSET = EXA_OFFSET + EXA_CP1 - EXA_CP0 + 1;
const SPC_OFFSET = EXB_OFFSET + EXB_CP1 - EXB_CP0 + 1;

function getIndexForCodePoint(cp, ssv) {
    if (STD_CP0 <= cp && cp <= STD_CP1) return cp - STD_CP0 + STD_OFFSET;
    if (AFT_CP0 <= cp && cp <= AFT_CP1) return cp - AFT_CP0 + AFT_OFFSET;
    if (EXA_CP0 <= cp && cp <= EXA_CP1) return cp - EXA_CP0 + EXA_OFFSET;
    if (EXB_CP0 <= cp && cp <= EXB_CP1) return cp - EXB_CP0 + EXB_OFFSET;
    if (ssv === 0 && SPC_CP0 <= cp && cp <= SPC_CP1) return cp - SPC_CP0 + SPC_OFFSET;
    return 0;
}

function checkMagic(stream, offset, lead, trail, version) {
    const binaryTagLead = stream.getUint32(offset); offset += 4;
    if (binaryTagLead !== lead) throw new Error('Unexpected magic number lead: ' + binaryTagLead.toString(16));
    const binaryTagTrail = stream.getUint32(offset); offset += 4;
    if (binaryTagTrail !== trail) throw new Error('Unexpected magic number trail: ' + binaryTagTrail.toString(16));
    if (version !== -1) {
        const binaryVersion = stream.getUint32(offset); offset += 4;
        if (binaryVersion !== version) throw new Error('Unexpected version: ' + binaryVersion.toString(16));
    }
    return offset;
}

class BinaryMarkov {
    constructor(stream, offset) {
        offset = checkMagic(stream, offset, 0x424D4152, 0x4B4F5620, 0);
        const size = stream.getInt16(offset); offset += 2;
        this.transitions = [];
        for (let i1 = 0; i1 < size; i1++) {
            this.transitions[i1] = [];
            let entries = stream.getInt16(offset); offset += 2;
            let fallback;
            if (entries === 0) {
                fallback = 0.0;
            } else {
                fallback = stream.getFloat32(offset); offset += 4;
            }
            let next = -1;
            for (let i2 = 0; i2 < size; i2++) {
                if (entries > 0 && next < i2) {
                    next = stream.getInt16(offset); offset += 2;
                    entries--;
                }
                if (next === i2) {
                    this.transitions[i1][i2] = stream.getFloat32(offset); offset += 4;
                } else {
                    this.transitions[i1][i2] = fallback;
                }
            }
        }
    }

    getLogProbabilityDifference(i1, i2) {
        return this.transitions[i1][i2];
    }
}

class ZawgyiUnicodeMarkovModel {
    constructor(stream, offset) {
        offset = checkMagic(stream, offset, 0x555A4D4F, 0x44454C20, -1);
        const binaryVersion = stream.getUint32(offset); offset += 4;
        if (binaryVersion === 1) {
            this.ssv = 0;
        } else if (binaryVersion === 2) {
            this.ssv = stream.getUint32(offset); offset += 4;
        } else {
            throw new Error('Serial version expected 1 or 2 but got ' + binaryVersion.toString(16));
        }
        this.classifier = new BinaryMarkov(stream, offset);
    }

    predict(input) {
        let prevState = 0;
        let totalDelta = 0.0;
        let seenTransition = false;
        for (let offset = 0; offset <= input.length; offset++) {
            let currState;
            if (offset === input.length) {
                currState = 0;
            } else {
                currState = getIndexForCodePoint(input.charCodeAt(offset), this.ssv);
            }
            if (prevState !== 0 || currState !== 0) {
                totalDelta += this.classifier.getLogProbabilityDifference(prevState, currState);
                seenTransition = true;
            }
            prevState = currState;
        }
        if (!seenTransition) return Number.NEGATIVE_INFINITY;
        return 1.0 / (1.0 + Math.exp(totalDelta));
    }
}

function loadDetector() {
    const buffer = fs.readFileSync(MODEL_FILE);
    const arrayBuffer = new ArrayBuffer(buffer.length);
    new Uint8Array(arrayBuffer).set(buffer);
    return new ZawgyiUnicodeMarkovModel(new DataView(arrayBuffer, 0), 0);
}

const detector = loadDetector();

// ---------------------------------------------------------------------------
// Zawgyi -> Unicode converter — port of Google myanmar-tools ZawgyiConverter
// (Apache-2.0) using the transliteration rules shipped as resources/Z2U.js.
// ---------------------------------------------------------------------------

function loadZ2URules() {
    const source = fs.readFileSync(Z2U_RULES_FILE, 'utf8');
    const sandbox = {};
    vm.runInNewContext(source, sandbox);
    if (typeof sandbox.getAllRulesZ2U !== 'function') {
        throw new Error('getAllRulesZ2U not found in Z2U.js');
    }
    return sandbox.getAllRulesZ2U;
}

const getAllRulesZ2U = loadZ2URules();

function runPhase(rules, inString) {
    let outString = '';
    let midString = inString;
    let startOfString = true;
    while (midString.length > 0) {
        let foundRule = false;
        for (const rule of rules) {
            if (rule.matchOnStart == null || startOfString) {
                const m = midString.match(rule.p);
                if (m != null) {
                    foundRule = true;
                    const rightPartSize = midString.length - m[0].length;
                    midString = midString.replace(rule.p, rule.s);
                    const newStart = midString.length - rightPartSize;
                    if (rule.revisit == null) {
                        outString += midString.substring(0, newStart);
                        midString = midString.substring(newStart);
                    }
                }
            }
        }
        if (!foundRule) {
            outString += midString[0];
            midString = midString.substring(1);
        }
        startOfString = false;
    }
    return outString;
}

function zawgyiToUnicode(text) {
    let outString = text;
    for (const rules of getAllRulesZ2U()) {
        outString = runPhase(rules, outString);
    }
    return outString;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

function getZawgyiProbability(text) {
    return detector.predict(text || '');
}

/**
 * Converts Zawgyi-encoded text to Unicode Myanmar. Unicode text passes
 * through unchanged. Returns the original input for non-Myanmar text.
 */
function normalizeToUnicode(text) {
    if (!text) return text;
    const prob = detector.predict(text);
    if (prob > 0.9) {
        return zawgyiToUnicode(text);
    }
    return text;
}

module.exports = { normalizeToUnicode, getZawgyiProbability };