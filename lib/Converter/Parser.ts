import { KnWord } from '../Model/KnWord';
import { Token, TokenType } from "./Token";
import { Lexer } from "./Lexer";
import { KnNodeType } from "../Model/KnType";
import { NodeHelper } from "../Util/NodeHelper";
import { SyntaxConfig } from "./SyntaxConfig";
import { KnQuasiQuote } from "../Model/KnQuasiQuote";
import { KnUnquote } from "../Model/KnUnquote";
import { KnCloseQuote } from "../Model/KnCloseQuote";
import { KnUnquoteSplicing } from "../Model/KnUnquoteSplicing";
import { KnProperty } from "../Model/KnProperty";
import { KnSubscript } from "../Model/KnSubscript";
import { KnKnot } from "../Model/KnKnot";
import { KnSymbol } from '../Model/KnSymbol';
import { ArrayExt } from '../Util/ArrayExt';


enum PrefixType {
    Annotation, // ![a % m="id" n="parent_id" %][xxx]
    Flag, // !Deprecated[xxx]
    Modifier, // !{System IO}[func (a~type_a b ~int) ~type_r]

    TypeParam, // [Map :<String Object>]
    ContextParam, // get :(field1 field2)() { [field1 field2 +;] }

    Definition, // :String aStr
}


enum SuffixType {
    Definition, // a ~{int}
    Complement, // a ^SSS ^[where %A = [implements B]%]
}

class PrefixItem {
    public Type: PrefixType;
    public Value: any;
    constructor(t : PrefixType, v : any) {
        this.Type = t;
        this.Value = v;
    }
}

class PrefixContext {
    public Definition = null;
    public Annotation = [];
    public Flags  = [];
    public Modifiers = [];

    public TypeParams = [];
    public ContextParams = [];
}

class SuffixContext {
    public Definition  = null;
    public Complements = [];
}

class SuffixItem {
    public Type: SuffixType;
    public Value: any;
    constructor(t : SuffixType, v : any) {
        this.Type = t;
        this.Value = v;
    }
}



export class Parser {
    private lexer: Lexer;
    private currentToken: Token;

    static WORD_KNOT_PREFIX_TYPES = [
        PrefixType.Annotation,
        PrefixType.Flag,
        PrefixType.Modifier
    ];
    
    static KNOT_INNER_PREFIX_TYPES = [
        PrefixType.TypeParam,
        PrefixType.ContextParam
    ];

    constructor(lexer) {
        this.lexer = lexer;
        this.currentToken = this.lexer.getNextToken();
    }

    private GetCurToken() {
        return this.currentToken;
    }

    Error(message = '') {
        let errorText = 'Syntax error';
        if (message.length > 0) {
            errorText += `:${message}`
        }
        throw new Error(errorText);
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

    PrefixTokenType(prevTokenType: TokenType, char) : PrefixType {
        if (this.currentToken.Type == SyntaxConfig.PrefixTypeToken) {
            if (char == SyntaxConfig.KnotTypeParamBeginStr) {
                return PrefixType.TypeParam;
            }
            return PrefixType.Definition;
        }

        if (this.currentToken.Type == SyntaxConfig.PrefixToken) {
            if (char == SyntaxConfig.KnotAnnotationBeginStr) {
                return PrefixType.Annotation;
            } else if (char == SyntaxConfig.KnotModifierBeginStr) {
                return PrefixType.Modifier;
            } else if (char == SyntaxConfig.KnotContextParamBeginStr) {
                return PrefixType.ContextParam;
            } else if (/^[_a-zA-Z=@\+\-\*\/]/.test(char)) {
                return PrefixType.Flag;
            }
        }

        this.Error('illegal prefix token type : `' + char + '`');
    }

    ParsePrefixItem(acceptPrefixes: PrefixType[]) : PrefixItem {
        this.lexer.SkipWhitespaces();
        if (this.currentToken.Type != SyntaxConfig.PrefixTypeToken
            && this.currentToken.Type != SyntaxConfig.PrefixToken    
        ) {
            return null;
        }

        let charAfterPrefixToken = this.lexer.Peek(1, 0);
        let prefixType : PrefixType = this.PrefixTokenType(this.currentToken.Type, charAfterPrefixToken);
        if (!ArrayExt.Contains(acceptPrefixes, prefixType)) {
            return null;
        }

        this.Consume(this.currentToken.Type);
        if (prefixType === PrefixType.Definition) {
            let itemVal = this.Value({AcceptPrefix: false, AcceptSuffix: false});
            return new PrefixItem(PrefixType.Definition, itemVal);
        }
        else if (this.currentToken.Type === SyntaxConfig.KnotContextParamBeginToken) {
            let itemVal = this.KnVectorInner(
                SyntaxConfig.KnotContextParamBeginToken, SyntaxConfig.KnotContextParamEndToken);
            return new PrefixItem(PrefixType.ContextParam, itemVal);
        }
        else if (this.currentToken.Type === SyntaxConfig.KnotTypeParamBeginToken) {
            let itemVal = this.KnVectorInner(
                SyntaxConfig.KnotTypeParamBeginToken,
                SyntaxConfig.KnotTypeParamEndToken);
            return new PrefixItem(PrefixType.TypeParam, itemVal);
        }
        else if (this.currentToken.Type === TokenType.Word) {
            let itemVal = this.Value({AcceptPrefix: false, AcceptSuffix: false});
            return new PrefixItem(PrefixType.Flag, itemVal);
        }
        else if (this.currentToken.Type === SyntaxConfig.KnotAnnotationBeginToken) {
            let itemVal = this.Value({AcceptPrefix: false, AcceptSuffix: false});
            return new PrefixItem(PrefixType.Annotation, itemVal);
        }
        else if (this.currentToken.Type === SyntaxConfig.KnotModifierBeginToken) {
            let itemVal = this.KnVectorInner(
                SyntaxConfig.KnotModifierBeginToken,
                SyntaxConfig.KnotModifierEndToken);
            return new PrefixItem(PrefixType.Modifier, itemVal);
        }
        return null;
    }

    ParseSuffixItem() : SuffixItem {
        let suffixItemType = SuffixType.Definition;
        if (this.currentToken.Type === SyntaxConfig.SuffixComplementToken) {
            suffixItemType = SuffixType.Complement;
        }
        else if (this.currentToken.Type === SyntaxConfig.SuffixTypeToken) {
            suffixItemType = SuffixType.Definition;
        }
        this.Consume(this.currentToken.Type);
        let itemVal = this.Value({AcceptPrefix: false, AcceptSuffix: false});
        return new SuffixItem(suffixItemType, itemVal);
    }

    ParsePrefixContext(acceptPrefixes: PrefixType[]) : PrefixContext {
        let typeVars = [];
        let flags  = [];
        let annotations = [];
        let definition = null;

        let genericParams = [];
        let contextParams = [];
        
        
        while (this.currentToken.Type === SyntaxConfig.PrefixToken
            || this.currentToken.Type === SyntaxConfig.PrefixTypeToken
            ) {
            let prefix = this.ParsePrefixItem(acceptPrefixes);
            if (prefix == null) {
                break;
            }
            switch (prefix.Type) {
                case PrefixType.Definition:
                    definition = prefix.Value;
                    break;
                case PrefixType.Annotation:
                    annotations.push(prefix.Value);
                    break;
                case PrefixType.Flag:
                    flags.push(prefix.Value);
                    break;
                case PrefixType.Modifier:
                    typeVars = prefix.Value;
                    break;
                case PrefixType.TypeParam:
                    genericParams.push(prefix.Value);
                    break;
                case PrefixType.ContextParam:
                    contextParams.push(prefix.Value);
                    break;
            }
        }
        let result = new PrefixContext();
        result.Definition = definition;
        result.Modifiers = typeVars;
        result.Flags = flags;
        result.Annotation = annotations;
        result.TypeParams = genericParams;
        result.ContextParams = contextParams;
        return result;
    }

    ParseSuffixContext() : SuffixContext {
        let definition = null;
        let complements  = [];
        
        while (this.currentToken.Type === SyntaxConfig.SuffixTypeToken
            || this.currentToken.Type === SyntaxConfig.SuffixComplementToken
        ) {
            let suffix = this.ParseSuffixItem();
            if (suffix == null) {
                break;
            }
            switch (suffix.Type) {
                case SuffixType.Definition:
                    definition = suffix.Value;
                    break;
                case SuffixType.Complement:
                    complements.push(suffix.Value);
                    break;
            }
        }
        let result = new SuffixContext();
        result.Definition = definition;
        result.Complements = complements;
        return result;
    }

    ValueWithPrefix(config = {AcceptSuffix: true}) {
        let prefixContext = this.ParsePrefixContext(Parser.WORD_KNOT_PREFIX_TYPES);
        let value = this.Value({AcceptPrefix: true, AcceptSuffix: config.AcceptSuffix});
        let valueType = NodeHelper.GetType(value);
        if (valueType !== KnNodeType.KnWord && valueType !== KnNodeType.KnKnot) {
            return value;
        }
        if (prefixContext.Definition != null) {
            value.Definition = prefixContext.Definition;
        }
        if (prefixContext.ContextParams.length > 0) {
            value.ContextParams = prefixContext.ContextParams;
        }
        if (prefixContext.Flags.length > 0) {
            value.Flags = prefixContext.Flags;
        }
        if (prefixContext.Annotation.length > 0) {
            value.Annotations = prefixContext.Annotation;
        }
        if (prefixContext.Modifiers.length > 0) {
            value.Modifiers = prefixContext.Modifiers;
        }
        return value;
    }

    String() {
        const str = this.currentToken.Value;
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
            if (suffixContext.Complements != null) {
                word.Complements = suffixContext.Complements;
            }
        }
        return word;
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
        return new KnQuasiQuote(v);
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
        return new KnCloseQuote(v);
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
            this.Error(`parse key error, line ${this.currentToken.Line}, column ${this.currentToken.Column}`);
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
        let prefixContext = this.ParsePrefixContext(Parser.WORD_KNOT_PREFIX_TYPES);

        this.Consume(SyntaxConfig.KnotStartToken);

        let nodes = [];
        while (this.currentToken.Type != SyntaxConfig.KnotEndToken
            && this.currentToken.Type != TokenType.Eof
        ) {
            let top : KnKnot = nodes.length > 0 ? nodes[nodes.length - 1] : null;
            if (top == null) {
                top = new KnKnot({});
                nodes.push(top);
            }
            
            if (nodes.length == 1) {
                // set outer prefix
                top.Annotations = prefixContext.Annotation;
                top.Flags = prefixContext.Flags;
                top.Modifiers = prefixContext.Modifiers;
            }

            let charAfterPrefixToken = this.lexer.Peek(1, 0);
            if ((this.currentToken.Type === SyntaxConfig.PrefixToken
                    && charAfterPrefixToken == SyntaxConfig.KnotContextParamBeginStr
                )
                ||
                (this.currentToken.Type === SyntaxConfig.PrefixTypeToken
                    && charAfterPrefixToken == SyntaxConfig.KnotTypeParamBeginStr
                )
                ) {
                // set inner prefix
                let prefixContextInSegment = this.ParsePrefixContext(Parser.KNOT_INNER_PREFIX_TYPES);
                if (prefixContextInSegment.TypeParams.length > 0) {
                    top.TypeParam = prefixContextInSegment.TypeParams[prefixContextInSegment.TypeParams.length - 1];
                }
                if (prefixContextInSegment.ContextParams.length > 0) {
                    top.ContextParam = prefixContextInSegment.ContextParams[prefixContextInSegment.ContextParams.length - 1];
                }
            }
            else if (this.currentToken.Type === TokenType.Semicolon) {
                this.Consume(null);
                if (!this.KnotAcceptSegmentStop(top)) {
                    top = new KnKnot({});
                    nodes.push(top);
                }
                top.SegmentStop = true;
            }

            else if (this.currentToken.Type === SyntaxConfig.KnotParamBeginToken) {
                if (!this.KnotAcceptParam(top)) {
                    top = new KnKnot({});
                    nodes.push(top);
                }
                top.Param = this.KnVectorInner(SyntaxConfig.KnotParamBeginToken, SyntaxConfig.KnotParamEndToken);
            }
            
            else if (this.currentToken.Type === SyntaxConfig.SuffixTypeToken
                || this.currentToken.Type === SyntaxConfig.SuffixComplementToken
            ) {
                let suffixContext = this.ParseSuffixContext();
                if (suffixContext.Definition != null) {
                    if (!this.KnotAcceptDefinition(top)
                    ) {
                        top = new KnKnot({});
                        nodes.push(top);
                    }
                    top.Definition = suffixContext.Definition;
                }
                if (suffixContext.Complements != null) {
                    if (!this.KnotAcceptComplements(top)
                    ) {
                        top = new KnKnot({});
                        nodes.push(top);
                    }
                    top.Complements = suffixContext.Complements;
                }
            }

            else if (this.currentToken.Type === SyntaxConfig.KnotAttrStartToken) {
                if (!this.KnotAcceptAttr(top)) {
                    top = new KnKnot({});
                    nodes.push(top);
                }
                let map = this.KnMapInner(SyntaxConfig.KnotAttrStartToken, SyntaxConfig.KnotAttrEndToken);
                top.Attr = map;
            }

            else if (this.currentToken.Type === SyntaxConfig.KnotBlockStartToken) {
                if (!this.KnotAcceptBlock(top)) {
                    top = new KnKnot({});
                    nodes.push(top);
                }
                let vector = this.KnVectorInner(SyntaxConfig.KnotBlockStartToken, SyntaxConfig.KnotBlockEndToken);
                top.Block = vector;
            }
            else {
                if (!this.KnotAcceptCore(top)) {
                    top = new KnKnot({});
                    nodes.push(top);
                }
                let core = this.Value({AcceptPrefix: true, AcceptSuffix: true});
                top.Core = core;
            }
            this.lexer.SkipWhitespaces();
        }

        let result = NodeHelper.MakeKnotChainByShallowCopy(nodes)

        this.Consume(SyntaxConfig.KnotEndToken);
        return result;
    }

    KnotAcceptCore(knot) {
        return (knot.Core == null) && this.KnotAcceptParam(knot);
    }

    KnotAcceptSegmentStop(knot) {
        return this.KnotAcceptParam(knot);
    }

    KnotAcceptParam(knot: KnKnot) {
        return (knot.Param == null) && this.KnotAcceptDefinition(knot);
    }

    KnotAcceptDefinition(knot: KnKnot) {
        return (knot.Definition == null) && this.KnotAcceptComplements(knot);
    }

    KnotAcceptComplements(knot: KnKnot) {
        return (knot.Complements == null) && this.KnotAcceptAttr(knot);
    }

    KnotAcceptAttr(knot : KnKnot) {
        return (knot.Attr == null) && this.KnotAcceptBlock(knot);
    }

    KnotAcceptBlock(knot : KnKnot) {
        return (knot.Block == null);
    }
}

