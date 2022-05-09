import { KnWord } from '../Model/KnWord';
import { Token, TokenType } from "./Token";
import { Lexer } from "./Lexer";
import { KnType } from "../Model/KnType";
import { NodeHelper } from "../Util/NodeHelper";
import { SyntaxConfig } from "./SyntaxConfig";
import { KnQuasiquote } from "../Model/KnQuasiquote";
import { KnUnquote } from "../Model/KnUnquote";
import { KnQuote } from "../Model/KnQuote";
import { KnUnquoteSplicing } from "../Model/KnUnquoteSplicing";
import { KnProperty } from "../Model/KnProperty";
import { KnSubscript } from "../Model/KnSubscript";
import { KnKnot } from "../Model/KnKnot";
import { KnSymbol } from '../Model/KnSymbol';

class PrefixItem {
    public PrefixType: PrefixType;
    public Value: any;
    constructor(t : PrefixType, v : any) {
        this.PrefixType = t;
        this.Value = v;
    }
}

class PrefixContext {
    public Flags  = [];
    public Annotation = [];
    public TypeVars = [];

    public ContextParams = [];
    public GenericParams = [];
}

enum PrefixType {
    TypeVars, // :{type_a type_r}[func (a~type_a b ~int) ~type_r]
    Flag, // :Deprecated[xxx]
    Annotation, // :[a % m="id" n="parent_id" %][xxx]
    GenericParam, // [Map :<String Object>]
    ContextParam, // get :(field1 field2)() { [field1 field2 +;] }
}

enum SuffixType {
    Definition, // a ~{int}
    Refinement, // a ~{A} ~<[where %A = [implements B]%]>
}

class SuffixContext {
    public Definition  = null;
    public Refinements = [];
}

class SuffixItem {
    public SuffixType: SuffixType;
    public Value: any;
    constructor(t : SuffixType, v : any) {
        this.SuffixType = t;
        this.Value = v;
    }
}

export class Parser {
    private lexer: Lexer;
    private currentToken: Token;

    constructor(lexer) {
        this.lexer = lexer;
        this.currentToken = this.lexer.getNextToken();
    }

    private GetCurToken() {
        return this.currentToken;
    }

    Error() {
        throw new Error('Syntax error');
    }

    public ParseRoot() {
        if (this.currentToken.Type === SyntaxConfig.VectorStartToken) {
            return this.KnVector();
        }
        else if (this.currentToken.Type === SyntaxConfig.MapStartToken) {
            return this.KnMap();
        }
        else if (this.currentToken.Type === SyntaxConfig.KnotStartToken) {
            return this.KnKnot();
        }
        else if (this.currentToken.Type === SyntaxConfig.PrefixToken) {
            return this.ValueWithPrefix();
        }
    }

    static Parse(text) {
        const lexer = new Lexer(text);
        const parser = new Parser(lexer);

        // return parser.parseRoot();
        return parser.Value();
    }


    Consume(expectedType: TokenType) {
        if (expectedType == null || this.currentToken.Type === expectedType) {
            this.currentToken = this.lexer.getNextToken();
        } else {
            this.Error();
        }
    }



    Value(config = {AcceptPrefix: true, AcceptSuffix: true}) {
        if (this.currentToken.Type === SyntaxConfig.PrefixToken) {
            return this.ValueWithPrefix(config);
        }
        else if (this.currentToken.Type === TokenType.Dollar) {
            return this.SyntaxPrefix();
        }
        else if (this.currentToken.Type === TokenType.String) {
            return this.String();
        }
        else if (this.currentToken.Type === TokenType.Number) {
            return this.Number();
        }
        else if (this.currentToken.Type === TokenType.Boolean) {
            return this.Boolean();
        }
        else if (this.currentToken.Type === TokenType.Property) {
            return this.Property();
        }
        else if (this.currentToken.Type === TokenType.Subscript) {
            return this.Subscript();
        }
        else if (this.currentToken.Type === TokenType.QuasiQuote) {
            return this.QuasiQuote();
        }
        else if (this.currentToken.Type === TokenType.Comma) {
            return this.Unquote();
        }
        else if (this.currentToken.Type === TokenType.UnquoteSplicing) {
            return this.UnquoteSplicing();
        }
        else if (this.currentToken.Type === TokenType.At) {
            return this.Quote();
        }
        else if (this.currentToken.Type === TokenType.BiggerThan
            || this.currentToken.Type === TokenType.LowerThan) {
                return this.Word(config);
        }
        else if (this.currentToken.Type === SyntaxConfig.MapStartToken) {
            return this.KnMap();
        }
        else if (this.currentToken.Type === SyntaxConfig.VectorStartToken) {
            return this.KnVector();
        }
        else if (this.currentToken.Type === SyntaxConfig.KnotStartToken) {
            return this.KnKnot();
        }
        // else if (this.currentToken.Type === TokenType.EllipsisDots) {
        //     return this.Word(config);
        // }
        else if (this.currentToken.Type === TokenType.Word) {
            return this.Word(config);
        }
        let tokenInner = this.currentToken.Value;
        this.Consume(null);
        return new KnWord(tokenInner);
        // this.Error();
    }

    ParsePrefixItem() : PrefixItem {
        this.Consume(SyntaxConfig.PrefixToken);
        if (this.currentToken.Type === SyntaxConfig.MapStartToken) {
            let prefixItemVal = this.KnVectorInner(SyntaxConfig.MapStartToken, SyntaxConfig.MapEndToken);
            return new PrefixItem(PrefixType.ContextParam, prefixItemVal);
        }
        else if (this.currentToken.Type === TokenType.LowerThan) {
            let prefixItemVal = this.KnVectorInner(TokenType.LowerThan, TokenType.BiggerThan);
            return new PrefixItem(PrefixType.GenericParam, prefixItemVal);
        }
        else if (this.currentToken.Type === TokenType.Word
        ) {
            let prefixItemVal = this.Value({AcceptPrefix: false, AcceptSuffix: false});
            return new PrefixItem(PrefixType.Flag, prefixItemVal);
        }
        else if (this.currentToken.Type === SyntaxConfig.KnotStartToken) {
            let prefixItemVal = this.Value({AcceptPrefix: false, AcceptSuffix: false});
            return new PrefixItem(PrefixType.Annotation, prefixItemVal);
        }
        else if (this.currentToken.Type === SyntaxConfig.VectorStartToken) {
            let prefixItemVal = this.Value({AcceptPrefix: false, AcceptSuffix: false});
            return new PrefixItem(PrefixType.TypeVars, prefixItemVal);
        }
        return null;
    }

    ParseSuffixItem() : SuffixItem {
        this.Consume(SyntaxConfig.SuffixToken);
        if (this.currentToken.Type === TokenType.LowerThan) {
            let prefixItemVal = this.KnVectorInner(TokenType.LowerThan, TokenType.BiggerThan);
            return new SuffixItem(SuffixType.Refinement, prefixItemVal);
        }
        else {
            let prefixItemVal = this.Value({AcceptPrefix: false, AcceptSuffix: false});
            return new SuffixItem(SuffixType.Definition, prefixItemVal);
        }
        return null;
    }

    ParsePrefixContext() : PrefixContext {
        let typeVars = [];
        let flags  = [];
        let annotatiosn = [];

        let genericParams = [];
        let contextParams = [];
        
        
        while (this.currentToken.Type === SyntaxConfig.PrefixToken) {
            let prefix = this.ParsePrefixItem();
            switch (prefix.PrefixType) {
                case PrefixType.TypeVars:
                    typeVars.push(prefix.Value);
                    break;
                case PrefixType.Flag:
                    flags.push(prefix.Value);
                    break;
                case PrefixType.Annotation:
                    annotatiosn.push(prefix.Value);
                    break;
                case PrefixType.GenericParam:
                    genericParams.push(prefix.Value);
                    break;
                case PrefixType.ContextParam:
                    contextParams.push(prefix.Value);
                    break;
            }
        }
        let result = new PrefixContext();
        result.TypeVars = typeVars;
        result.Flags = flags;
        result.Annotation = annotatiosn;
        result.GenericParams = genericParams;
        result.ContextParams = contextParams;
        return result;
    }


    ParseSuffixContext() : SuffixContext {
        let definition = null;
        let refinements  = null;
        
        while (this.currentToken.Type === SyntaxConfig.SuffixToken) {
            let suffix = this.ParseSuffixItem();
            switch (suffix.SuffixType) {
                case SuffixType.Definition:
                    definition = suffix.Value;
                    break;
                case SuffixType.Refinement:
                    refinements = suffix.Value;
                    break;
            }
        }
        let result = new SuffixContext();
        result.Definition = definition;
        result.Refinements = refinements;
        return result;
    }

    ValueWithPrefix(config = {AcceptSuffix: true}) {
        let prefixContext = this.ParsePrefixContext();
        let value = this.Value({AcceptPrefix: true, AcceptSuffix: config.AcceptSuffix});
        let valueType = NodeHelper.GetType(value);
        if (valueType !== KnType.Word || valueType !== KnType.Knot) {
            return value;
        }
        if (valueType === KnType.Word) {
            if (prefixContext.Flags.length > 0) {
                value.Flags = prefixContext.Flags;
            }
            else if (prefixContext.Annotation.length > 0) {
                value.Annotations = prefixContext.Annotation;
            }
        }
        else if (valueType === KnType.Knot) {
            if (prefixContext.Flags.length > 0) {
                value.Flags = prefixContext.Flags;
            }
            else if (prefixContext.Annotation.length > 0) {
                value.Annotations = prefixContext.Annotation;
            }
            else if (prefixContext.TypeVars.length > 0) {
                value.TypeVars = prefixContext.TypeVars;
            }
        }
        return value;
    }



    String() {
        const str = this.currentToken.Value.slice(1, -1);
        this.Consume(TokenType.String);
        return str;
    }

    Word(config = {AcceptSuffix: true}) {
        const str = this.currentToken.Value;
        this.Consume(null);
        let word = new KnWord(str);
        if (config.AcceptSuffix) {
            let suffixContext = this.ParseSuffixContext();
            if (suffixContext.Definition != null) {
                word.Definition = suffixContext.Definition;
            }
            if (suffixContext.Refinements != null) {
                word.Refinements = suffixContext.Refinements;
            }
        }
        return word;
    }

    Property() {
        this.Consume(TokenType.Property);
        let word = this.Word();
        return new KnProperty(word.Value);
    }

    Subscript() {
        this.Consume(TokenType.Subscript);
        let v = this.Value();
        return new KnSubscript(v);
    }
    QuasiQuote() {
        this.Consume(TokenType.QuasiQuote);
        let v = this.Value();
        return new KnQuasiquote(v);
    }
    Unquote() {
        this.Consume(TokenType.Comma);
        let v = this.Value();
        return new KnUnquote(v) ;
    }
    UnquoteSplicing() {
        this.Consume(TokenType.UnquoteSplicing);
        let v = this.Value();
        return new KnUnquoteSplicing(v);
    }
    Quote() {
        this.Consume(TokenType.At);
        let v = this.Value();
        return new KnQuote(v);
    }

    Number() {
        const num = this.currentToken.Value;
        this.Consume(TokenType.Number);
        return num;
    }

    Boolean() {
        const boolStr = this.currentToken.Value;
        this.Consume(TokenType.Boolean);
        if (boolStr === 'true') {
            return true;
        } else {
            return false;
        }
    }


    KnVector() {
        return this.KnVectorInner(SyntaxConfig.VectorStartToken, SyntaxConfig.VectorEndToken);
    }

    KnVectorInner(beginToken, endToken) {
        const array = [];
        this.Consume(beginToken);
        while (this.currentToken.Type != endToken
            && this.currentToken.Type != TokenType.Eof) {
            if (SyntaxConfig.EnableCommaSeperator
                && this.currentToken.Type === TokenType.Comma
            ) {
                this.Consume(TokenType.Comma);
            }
            array.push(this.Value());
        }
        this.Consume(endToken);
        return array;
    }

    Key() {
        // return this.String();
        if (this.currentToken.Type === TokenType.String) {
            return this.String();
        } else if (this.currentToken.Type === TokenType.Word) {
            const str = this.currentToken.Value;
            this.Consume(TokenType.Word);
            return str;
        } else {
            this.Error();
        }
    }

    KeyValPair() {
        let key = this.Key();
        let val = NodeHelper.Ukn;
        if (this.currentToken.Type === SyntaxConfig.MapPairSeperatorToken) {
            this.Consume(SyntaxConfig.MapPairSeperatorToken);
            val = this.Value();
        }
        if (SyntaxConfig.EnableCommaSeperator
            && this.currentToken.Type === TokenType.Comma
        ) {
            this.Consume(TokenType.Comma);
        }
        return [key, val];
    }

    KnMap() {
        return this.KnMapInner(SyntaxConfig.MapStartToken, SyntaxConfig.MapEndToken);
    }

    KnMapInner(beginToken, endToken) {
        const result = {};
        this.Consume(beginToken);
        while (this.currentToken.Type != endToken) {
            let pair = this.KeyValPair();
            result[pair[0]] = pair[1];
        }
        this.Consume(endToken);
        return result;
    }

    SyntaxPrefix() {
        this.Consume(null);
        let nextToken = this.currentToken;
        if (this.currentToken.Type === SyntaxConfig.MapStartToken) {
            return this.KnMap();
        }
        else if (this.currentToken.Type === SyntaxConfig.VectorStartToken) {
            return this.KnVector();
        }
        else if (this.currentToken.Type === SyntaxConfig.KnotStartToken) {
            let knot = this.KnKnot();
            knot.IsData = true;
            return knot;
        }
        else {
            let symInner = "";
            if (nextToken.Type === TokenType.Word) {
                symInner = nextToken.Value;
                this.Consume(null);
            }
            return new KnSymbol(symInner);
        }
    }

    KnKnot() : KnKnot {
        let nodes = [];
        this.Consume(SyntaxConfig.KnotStartToken);

        while (this.currentToken.Type != SyntaxConfig.KnotEndToken
            && this.currentToken.Type != TokenType.Eof
        ) {
            let top : KnKnot = nodes.length > 0 ? nodes[nodes.length - 1] : null;
            if (top == null) {
                top = new KnKnot({});
                nodes.push(top);
            }
            if (this.currentToken.Type === SyntaxConfig.PrefixToken) {
                let prefixContext = this.ParsePrefixContext();
                let nextToken = this.GetCurToken().Type;
                if (nextToken === TokenType.Word) {
                    if (!this.KnotAcceptCore(top)) {
                        top = new KnKnot({});
                        nodes.push(top);
                    }
                    let core = this.Word({AcceptSuffix: false});
                    top.Core = core;
                    if (prefixContext.Flags.length > 0) {
                        core.Flags = prefixContext.Flags;
                    }
                    else if (prefixContext.Annotation.length > 0) {
                        core.Annotations = prefixContext.Annotation;
                    }
                }

                if (prefixContext.GenericParams.length > 0) {
                    top.GenericParam = prefixContext.GenericParams[prefixContext.GenericParams.length - 1];
                }
                if (prefixContext.ContextParams.length > 0) {
                    top.ContextParam = prefixContext.ContextParams[prefixContext.ContextParams.length - 1];
                }
            }
            else if (this.currentToken.Type === TokenType.Semicolon) {
                this.Consume(null);
                if (this.KnotAcceptDoApply(top)) {
                    top.DoApply = true;
                    top = new KnKnot({});
                    nodes.push(top);
                }
                else {
                    throw new Error("syntax error. illegal do apply token position");
                }
            }
                        

            else if (this.currentToken.Type === SyntaxConfig.KnotParamBeginToken) {
                if (!this.KnotAcceptParam(top)) {
                    top = new KnKnot({});
                    nodes.push(top);
                }
                top.Param = this.KnVectorInner(SyntaxConfig.KnotParamBeginToken, SyntaxConfig.KnotParamEndToken);
            }
            
            else if (this.currentToken.Type === SyntaxConfig.SuffixToken) {
                let suffixContext = this.ParseSuffixContext();
                if (suffixContext.Definition != null) {
                    if (!this.KnotAcceptDefinition(top)
                    ) {
                        top = new KnKnot({});
                        nodes.push(top);
                    }
                    top.Definition = suffixContext.Definition;
                }
                if (suffixContext.Refinements != null) {
                    if (!this.KnotAcceptRefinements(top)
                    ) {
                        top = new KnKnot({});
                        nodes.push(top);
                    }
                    top.Refinements = suffixContext.Refinements;
                }
            }

            else if (this.currentToken.Type === SyntaxConfig.KnotHeaderStartToken) {
                if (!this.KnotAcceptHeader(top)) {
                    top = new KnKnot({});
                    nodes.push(top);
                }
                let map = this.KnMapInner(SyntaxConfig.KnotHeaderStartToken, SyntaxConfig.KnotHeaderEndToken);
                top.Header = map;
            }

            else if (this.currentToken.Type === SyntaxConfig.KnotBodyStartToken) {
                if (!this.KnotAcceptBody(top)) {
                    top = new KnKnot({});
                    nodes.push(top);
                }
                let vector = this.KnVectorInner(SyntaxConfig.KnotBodyStartToken, SyntaxConfig.KnotBodyEndToken);
                top.Body = vector;
            }
            else {
                if (!this.KnotAcceptCore(top)) {
                    top = new KnKnot({});
                    nodes.push(top);
                }
                let core = this.Value({AcceptPrefix: true, AcceptSuffix: false});
                top.Core = core;
            }
        }

        let result = NodeHelper.MakeKnotChain(nodes)

        this.Consume(SyntaxConfig.KnotEndToken);
        return result;
    }

    KnotAcceptCore(knot) {
        return (knot.Core == null) && this.KnotAcceptParam(knot);
    }

    KnotAcceptDoApply(knot) {
        return this.KnotAcceptParam(knot);
    }

    KnotAcceptParam(knot) {
        return (knot.Param == null) && this.KnotAcceptDefinition(knot);
    }

    KnotAcceptDefinition(knot) {
        return (knot.Definition == null) && this.KnotAcceptRefinements(knot);
    }

    KnotAcceptRefinements(knot) {
        return (knot.Refinements == null) && this.KnotAcceptHeader(knot);
    }

    KnotAcceptHeader(knot) {
        return (knot.Header == null) && this.KnotAcceptBody(knot);
    }



    KnotAcceptBody(knot) {
        return (knot.Body == null);
    }
}

