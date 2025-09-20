import { Observable, Subject } from "rxjs";
import * as z from "zod";
import colors from "../../../../palette.json";

export type Point = { x: number; y: number };

export class Color {
  private constructor(private value: number) {}

  is(other: Color): boolean {
    return this.value == other.value;
  }

  toHex() {
    return `#${colors[this.value]}`;
  }

  static black(): Color {
    return new Color(0);
  }

  static white(): Color {
    return new Color(63);
  }

  static palette(): Color[] {
    return Array.from({ length: colors.length }, (_, i) => new Color(i));
  }

  static PARSER = z
    .number()
    .gte(0)
    .lte(64)
    .transform((number) => new Color(number));
}

export class StateSnapshot {
  protected constructor(protected data: Color[][]) {}

  readPoint(point: Point): Color {
    return this.data[point.x][point.y] ?? Color.white();
  }
}

export class State extends StateSnapshot {
  protected constructor(protected data: Color[][]) {
    super(data);
  }

  editPoint(point: Point, color: Color) {
    this.data[point.x][point.y] = color;
  }

  snapshot(): StateSnapshot {
    return new StateSnapshot(this.data);
  }

  static empty(): State {
    return new State(
      Array.from({ length: 64 }, () => new Array(64).fill(Color.white()))
    );
  }

  static PARSER = z
    .array(z.array(Color.PARSER))
    .transform((data) => new State(data));
}

export type Edit = { from: [Point, Color][]; to: Color };

export class Editor {
  private _stateObservable = new Subject<StateSnapshot>();
  private _allowedActionsObservable = new Subject<AllowedActions>();
  private inProgressEdit: { edit: Edit; touchedPoints: Set<string> } | null =
    null;

  private constructor(
    private state: State,
    private undoStack: Edit[],
    private redoStack: Edit[]
  ) {}

  get stateObservable(): Observable<StateSnapshot> {
    return this._stateObservable;
  }

  get allowedActionsObservable(): Observable<AllowedActions> {
    return this._allowedActionsObservable;
  }

  stateSnapshot(): StateSnapshot {
    return this.state.snapshot();
  }

  allowedActions(): AllowedActions {
    return {
      undo: !this.inProgressEdit && this.undoStack.length != 0,
      redo: !this.inProgressEdit && this.redoStack.length != 0,
    };
  }

  beginEdit(color: Color) {
    this.inProgressEdit = {
      edit: { from: [], to: color },
      touchedPoints: new Set(),
    };
    this.redoStack = [];
    this.notifyAllowedActions();
  }

  brushPoints(center: Point, size: number) {
    const points = squareAround(center, size);
    this.addPoints(points);
  }

  addPoints(points: Point[]) {
    if (!this.inProgressEdit) {
      throw new Error("No in-progress edit");
    }

    for (const point of points) {
      const pointKey = `${point.x}:${point.y}`;
      if (!this.inProgressEdit.touchedPoints.has(pointKey)) {
        this.inProgressEdit.touchedPoints.add(pointKey);
        this.inProgressEdit.edit.from.push([
          point,
          this.state.readPoint(point),
        ]);
        this.state.editPoint(point, this.inProgressEdit.edit.to);
      }
    }
    this.notifyState();
  }

  commitEdit() {
    if (!this.inProgressEdit) {
      throw new Error("No in-progress edit");
    }

    this.undoStack.push(this.inProgressEdit.edit);
    this.inProgressEdit = null;
    this.notifyAllowedActions();
  }

  undo() {
    const edit = this.undoStack.pop();
    if (!edit || this.inProgressEdit) {
      throw new Error("Undo is not allowed");
    }
    for (const [point, color] of edit.from) {
      this.state.editPoint(point, color);
    }
    this.redoStack.push(edit);
    this.notifyState();
    this.notifyAllowedActions();
  }

  redo() {
    const edit = this.redoStack.pop();
    if (!edit || this.inProgressEdit) {
      throw new Error("Redo is not allowed");
    }
    for (const [point, _] of edit.from) {
      this.state.editPoint(point, edit.to);
    }
    this.undoStack.push(edit);
    this.notifyState();
    this.notifyAllowedActions();
  }

  save(): string {
    const denormalize = (
      normalized: Edit[]
    ): z.infer<typeof Editor.PARSER>["undo" | "redo"] => {
      return normalized.map((normalized) => ({
        from: Array.from(normalized.from),
        to: normalized.to,
      }));
    };

    const denormalized: z.infer<typeof Editor.PARSER> = {
      state: this.state,
      undo: denormalize(this.undoStack),
      redo: denormalize(this.redoStack),
    };

    return JSON.stringify(denormalized);
  }

  clear() {
    this.state = State.empty();
    this.inProgressEdit = null;
    this.undoStack = [];
    this.redoStack = [];
    this.notifyState();
    this.notifyAllowedActions();
  }

  static empty(): Editor {
    return new Editor(State.empty(), [], []);
  }

  static restore(json: string): Editor | null {
    try {
      const data = this.PARSER.parse(json);
      const editor = new Editor(data.state, data.undo, data.redo);
      return editor;
    } catch (e) {
      return null;
    }
  }

  private notifyAllowedActions() {
    this._allowedActionsObservable.next(this.allowedActions());
  }

  private notifyState() {
    this._stateObservable.next(this.state.snapshot());
  }

  private static PARSER = (() => {
    const transitionParser = z.object({
      from: z.array(
        z.tuple([
          z.object({
            x: z.number().gte(0).lte(64),
            y: z.number().gte(0).lte(64),
          }),
          Color.PARSER,
        ])
      ),
      to: Color.PARSER,
    });
    return z.object({
      state: State.PARSER,
      undo: z.array(transitionParser),
      redo: z.array(transitionParser),
    });
  })();
}

export type AllowedActions = {
  undo: boolean;
  redo: boolean;
};

function squareAround({ x, y }: Point, size: number) {
  const xs = Array.from({ length: 2 * size + 1 }, (_, i) => x - size + i);
  const ys = Array.from({ length: 2 * size + 1 }, (_, i) => y - size + i);

  return xs
    .flatMap((cx) => ys.map((cy) => ({ x: cx, y: cy })))
    .filter(({ x, y }) => x >= 0 && x <= 64 && y >= 0 && y <= 64);
}
