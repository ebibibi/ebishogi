"use client";

export type CandidateMove = {
  readonly usi: string;
  readonly score: number;
  readonly pv: readonly string[];
  readonly rank: number;
};

export type SearchResult = {
  readonly bestmove: string;
  readonly candidates: readonly CandidateMove[];
};

type SearchOptions = {
  readonly multiPV?: number;
  readonly timeMs?: number;
  readonly depth?: number;
  readonly onInfo?: (candidates: readonly CandidateMove[]) => void;
};

interface YaneuraOuModule {
  addMessageListener: (listener: (line: string) => void) => void;
  removeMessageListener: (listener: (line: string) => void) => void;
  postMessage: (command: string) => void;
  terminate: () => void;
}

type ActiveSearch = {
  candidates: Map<number, CandidateMove>;
  onInfo?: (candidates: readonly CandidateMove[]) => void;
  resolve: (result: SearchResult) => void;
};

type QueuedSearch = {
  sfen: string;
  options: SearchOptions;
  resolve: (result: SearchResult) => void;
};

function parseInfoLine(line: string): {
  depth?: number;
  score?: number;
  multipv?: number;
  pv?: string[];
} | null {
  if (!line.startsWith("info ")) return null;
  const tokens = line.split(" ");
  let depth: number | undefined;
  let score: number | undefined;
  let multipv: number | undefined;
  let pv: string[] | undefined;
  let i = 1;
  while (i < tokens.length) {
    switch (tokens[i]) {
      case "depth":
        depth = parseInt(tokens[++i], 10);
        break;
      case "score":
        i++;
        if (tokens[i] === "cp") score = parseInt(tokens[++i], 10);
        else if (tokens[i] === "mate") {
          const m = parseInt(tokens[++i], 10);
          score = m > 0 ? 30000 - m : -30000 - m;
        }
        break;
      case "multipv":
        multipv = parseInt(tokens[++i], 10);
        break;
      case "pv":
        pv = tokens.slice(i + 1);
        i = tokens.length;
        break;
      default:
        break;
    }
    i++;
  }
  return { depth, score, multipv, pv };
}

class ShogiEngine {
  private module: YaneuraOuModule | null = null;
  private initPromise: Promise<void> | null = null;
  private active: ActiveSearch | null = null;
  private waitingForStop = false;
  private queued: QueuedSearch | null = null;

  async init(): Promise<void> {
    if (this.module) return;
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.doInit();
    return this.initPromise;
  }

  private async doInit(): Promise<void> {
    if (typeof SharedArrayBuffer === "undefined") {
      throw new Error("SharedArrayBuffer not available");
    }

    await new Promise<void>((resolve, reject) => {
      if ((globalThis as any).YaneuraOu_HalfKP) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = "/engine/yaneuraou.halfkp.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load engine script"));
      document.head.appendChild(script);
    });

    const factory = (globalThis as any).YaneuraOu_HalfKP;
    if (!factory) throw new Error("Engine factory not found");

    this.module = (await factory({
      locateFile: (file: string) => `/engine/${file}`,
    })) as YaneuraOuModule;

    this.module.addMessageListener((line: string) => this.onMessage(line));

    await this.waitForResponse("usi", "usiok");

    this.module.postMessage("setoption name Threads value 1");
    this.module.postMessage("setoption name USI_Hash value 16");
    this.module.postMessage("setoption name BookFile value no_book");

    await this.waitForResponse("isready", "readyok");
  }

  private waitForResponse(command: string, expected: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.module?.removeMessageListener(listener);
        reject(new Error(`Timeout waiting for ${expected}`));
      }, 30000);

      const listener = (line: string) => {
        if (line.trim() === expected) {
          clearTimeout(timeout);
          this.module?.removeMessageListener(listener);
          resolve();
        }
      };
      this.module!.addMessageListener(listener);
      this.module!.postMessage(command);
    });
  }

  async search(sfen: string, options: SearchOptions = {}): Promise<SearchResult> {
    await this.init();

    return new Promise<SearchResult>((resolve) => {
      if (this.active) {
        this.active.resolve({ bestmove: "", candidates: [] });
        this.active = null;
        this.module!.postMessage("stop");
        this.waitingForStop = true;
      }

      if (this.waitingForStop) {
        if (this.queued) {
          this.queued.resolve({ bestmove: "", candidates: [] });
        }
        this.queued = { sfen, options, resolve };
      } else {
        this.startSearch(sfen, options, resolve);
      }
    });
  }

  cancelSearch(): void {
    if (this.queued) {
      this.queued.resolve({ bestmove: "", candidates: [] });
      this.queued = null;
    }
    if (this.active) {
      this.active.resolve({ bestmove: "", candidates: [] });
      this.active = null;
      this.module?.postMessage("stop");
      this.waitingForStop = true;
    }
  }

  private startSearch(
    sfen: string,
    options: SearchOptions,
    resolve: (result: SearchResult) => void,
  ): void {
    const multiPV = options.multiPV ?? 1;

    this.active = {
      candidates: new Map(),
      onInfo: options.onInfo,
      resolve,
    };

    this.module!.postMessage(`setoption name MultiPV value ${multiPV}`);
    this.module!.postMessage(`position sfen ${sfen}`);

    if (options.depth) {
      this.module!.postMessage(`go depth ${options.depth}`);
    } else {
      this.module!.postMessage(`go movetime ${options.timeMs ?? 1000}`);
    }
  }

  private onMessage(line: string): void {
    if (line.startsWith("bestmove")) {
      if (this.waitingForStop) {
        this.waitingForStop = false;
        if (this.queued) {
          const { sfen, options, resolve } = this.queued;
          this.queued = null;
          this.startSearch(sfen, options, resolve);
        }
        return;
      }

      if (this.active) {
        const tokens = line.split(" ");
        const result: SearchResult = {
          bestmove: tokens[1] ?? "",
          candidates: Array.from(this.active.candidates.values()).sort(
            (a, b) => a.rank - b.rank,
          ),
        };
        this.active.resolve(result);
        this.active = null;
      }
      return;
    }

    if (!this.active || this.waitingForStop) return;

    const info = parseInfoLine(line);
    if (info?.pv?.length && info.score !== undefined) {
      const rank = info.multipv ?? 1;
      const candidate: CandidateMove = {
        usi: info.pv[0],
        score: info.score,
        pv: info.pv,
        rank,
      };
      this.active.candidates.set(rank, candidate);
      this.active.onInfo?.(
        Array.from(this.active.candidates.values()).sort(
          (a, b) => a.rank - b.rank,
        ),
      );
    }
  }

  dispose(): void {
    this.cancelSearch();
    if (this.module) {
      this.module.postMessage("quit");
      this.module.terminate();
      this.module = null;
    }
    this.initPromise = null;
  }
}

let instance: ShogiEngine | null = null;

export function getEngine(): ShogiEngine {
  if (!instance) {
    instance = new ShogiEngine();
  }
  return instance;
}
