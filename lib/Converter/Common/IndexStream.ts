// class ParseException extends Error {
//   constructor(message: string) {
//       super(message);
//   }
// }

// class EndOfStreamException extends Error {
//   constructor(message: string = "End of stream") {
//       super(message);
//   }
// }

// class IndexedStream<TElement, TConstraint extends TokenType> {
//   public static BlankTypes = new Set<TokenType>([
//       TokenType.NewLine,
//       TokenType.Whitespace,
//       TokenType.SingleLineComment
//   ]);

//   private readonly _input: TElement[];
//   private readonly _constraintChecker: (elem: TElement, type: TConstraint) => boolean;
//   private _index: number;

//   constructor(input: Iterable<TElement>, constraintChecker: (elem: TElement, type: TConstraint) => boolean) {
//       this._input = Array.from(input);
//       this._constraintChecker = constraintChecker;
//       this._index = 0;
//   }

//   public Current(): TElement {
//       if (this.End()) {
//           throw new EndOfStreamException();
//       }

//       return this._input[this._index];
//   }

//   public Consume(): TElement {
//       if (this.End()) {
//           throw new EndOfStreamException();
//       }

//       return this._input[this._index++];
//   }

//   public Consume(expectedType: TConstraint): TElement {
//       const elem = this.Consume();
//       if (this._constraintChecker(elem, expectedType)) {
//           return elem;
//       }

//       throw new ParseException(`Invalid token ${elem} at position ${this._index}`);
//   }

//   public Peek(nextOffset: number = 1): TElement | undefined {
//       if (this._index + nextOffset > this._input.length - 1) {
//           return undefined;
//       }

//       return this._input[this._index + nextOffset];
//   }

//   public End(): boolean {
//       return this._index >= this._input.length;
//   }

//   public NewParseException(): Error {
//       return new ParseException(`Invalid token ${this.Current()} at position ${this._index}`);
//   }

//   public NewEndOfStreamException(): Error {
//       return new EndOfStreamException();
//   }

//   public override toString(): string {
//       return `[CharStream Index=${this._index}, Input=${this._input}]`;
//   }
// }
