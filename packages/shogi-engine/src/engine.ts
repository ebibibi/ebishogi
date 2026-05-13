import { buildGoCommand, buildPositionCommand, parseBestMove, parseInfoLine } from "./protocol";
import type {
  EngineEvent,
  EngineOptions,
  EngineState,
  SearchOptions,
} from "./types";

export type EngineListener = (event: EngineEvent) => void;

export class ShogiEngine {
  private worker: Worker | null = null;
  private state: EngineState = "idle";
  private listeners: EngineListener[] = [];
  private messageHandler: ((line: string) => void) | null = null;

  async init(wasmUrl: string, options: EngineOptions = {}): Promise<void> {
    this.setState("loading");

    try {
      this.worker = new Worker(wasmUrl, { type: "module" });

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Engine init timeout")), 30000);

        this.messageHandler = (line: string) => {
          if (line === "usiok") {
            clearTimeout(timeout);
            this.applyOptions(options);
            this.send("isready");
          } else if (line === "readyok") {
            this.setState("ready");
            resolve();
          }
        };

        this.worker!.onmessage = (e: MessageEvent) => {
          const line = typeof e.data === "string" ? e.data : e.data?.toString();
          if (line) this.handleMessage(line);
        };

        this.worker!.onerror = (e) => {
          clearTimeout(timeout);
          this.setState("error");
          reject(e);
        };

        this.send("usi");
      });
    } catch (error) {
      this.setState("error");
      throw error;
    }
  }

  search(sfen: string, moves: readonly string[], options: SearchOptions = {}): void {
    if (this.state !== "ready") return;

    this.setState("searching");
    this.send(buildPositionCommand(sfen, moves));
    this.send(buildGoCommand(options));
  }

  stop(): void {
    if (this.state === "searching") {
      this.send("stop");
    }
  }

  quit(): void {
    this.send("quit");
    this.worker?.terminate();
    this.worker = null;
    this.setState("idle");
    this.listeners = [];
  }

  getState(): EngineState {
    return this.state;
  }

  addListener(listener: EngineListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private send(command: string): void {
    this.worker?.postMessage(command);
  }

  private handleMessage(line: string): void {
    this.messageHandler?.(line);

    const info = parseInfoLine(line);
    if (info?.depth !== undefined && info?.score !== undefined && info?.pv) {
      this.emit({
        type: "info",
        info: {
          depth: info.depth,
          score: info.score,
          pv: info.pv,
          nodes: info.nodes,
          nps: info.nps,
          time: info.time,
          multipv: info.multipv,
        },
      });
    }

    const bestmove = parseBestMove(line);
    if (bestmove) {
      this.setState("ready");
      this.emit({ type: "bestmove", result: bestmove });
    }
  }

  private setState(state: EngineState): void {
    this.state = state;
    this.emit({ type: "state", state });
  }

  private emit(event: EngineEvent): void {
    for (const listener of this.listeners) listener(event);
  }

  private applyOptions(options: EngineOptions): void {
    if (options.threads) this.send(`setoption name Threads value ${options.threads}`);
    if (options.hashMB) this.send(`setoption name USI_Hash value ${options.hashMB}`);
    if (options.multiPV) this.send(`setoption name MultiPV value ${options.multiPV}`);
    if (options.skillLevel !== undefined) {
      this.send(`setoption name Skill_Level value ${options.skillLevel}`);
    }
  }
}
