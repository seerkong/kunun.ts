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
    TypeWhere,
}


enum SuffixType {
    Definition, // a ~{int}
    TypeResult,
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
    public Modifier = [];

    public TypeParams = [];
    public ContextParam = [];
    public TypeWhere = null;
}

class SuffixContext {
    public Definition  = null;
    public TypeResult  = null;
    public Complement = [];
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
        PrefixType.Modifier,
        
        PrefixType.ContextParam,
        PrefixType.TypeWhere,
        PrefixType.Definition
    ];
    
    static KNOT_INNER_PREFIX_TYPES = [
        PrefixType.TypeParam,
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

    SkipBlankTokens() {
        this.lexer.SkipWhitespaces();
    }


    Consume(expectedType: TokenType) {
        if (expectedType == null || this.currentToken.Type === expectedType) {
            this.currentToken = this.lexer.getNextToken();
        } else {
            this.Error();
        }
    }



    Value(config = {AcceptPrefix: true, AcceptSuffix: true}) {
        if (this.currentToken.Type === SyntaxConfig.PrefixToken
            || this.currentToken.Type === SyntaxConfig.PrefixTypeToken
        ) {
            return this.ValueWithPrefix(config);
        }
        else if (this.currentToken.Type === TokenType.Dollar) {
            return this.SyntaxPrefix();
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

        else if (this.currentToken.Type === TokenType.String) {
            return this.String();
        }
        else if (this.currentToken.Type === TokenType.Word) {
            return this.Word(config);
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
            return this.UnquoteReplace();
        }
        else if (this.currentToken.Type === TokenType.UnquoteExpand) {
            return this.UnquoteExpand();
        }
        else if (this.currentToken.Type === TokenType.At) {
            return this.CloseQuote();
        }
        else if (this.currentToken.Type === TokenType.BiggerThan
            || this.currentToken.Type === TokenType.LowerThan) {
                return this.Word(config);
        }
        
        // else if (this.currentToken.Type === TokenType.EllipsisDots) {
        //     return this.Word(config);
        // }
        
        let tokenInner = this.currentToken.Value;
        this.Consume(null);
        return new KnWord(tokenInner);
        // this.Error();
    }

    PrefixTokenType(nextChar) : PrefixType {
        if (this.currentToken.Type == SyntaxConfig.PrefixTypeToken) {
            if (nextChar == SyntaxConfig.KnotTypeParamBeginStr) {
                return PrefixType.TypeParam;
            }
            return PrefixType.Definition;
        }

        if (this.currentToken.Type == SyntaxConfig.PrefixToken) {
            if (nextChar == SyntaxConfig.KnotAnnotationBeginStr) {
                return PrefixType.Annotation;
            } else if (nextChar == SyntaxConfig.KnotModifierBeginStr) {
                return PrefixType.Modifier;
            } else if (nextChar == SyntaxConfig.KnotContextParamBeginStr) {
                return PrefixType.ContextParam;
            } else if (nextChar == SyntaxConfig.MoreAttrOrBlockToken) {
                return PrefixType.TypeWhere;
            } else if (/^[_a-zA-Z=@\+\-\*\/]/.test(nextChar)) {
                return PrefixType.Flag;
            }
        }

        this.Error('illegal prefix token type : `' + nextChar + '`');
    }

    ParsePrefixItem(acceptPrefixes: PrefixType[]) : PrefixItem {
        this.lexer.SkipWhitespaces();
        if (this.currentToken.Type != SyntaxConfig.PrefixTypeToken
            && this.currentToken.Type != SyntaxConfig.PrefixToken    
        ) {
            return null;
        }

        let charAfterPrefixToken = this.lexer.Peek(1, 0);
        let prefixType : PrefixType = this.PrefixTokenType(charAfterPrefixToken);
        if (!ArrayExt.Contains(acceptPrefixes, prefixType)) {
            return null;
        }

        this.Consume(this.currentToken.Type);
        if (prefixType === PrefixType.Flag) {
            let itemVal = this.Value({AcceptPrefix: false, AcceptSuffix: false});
            return new PrefixItem(PrefixType.Flag, itemVal);
        }
        else if (prefixType === PrefixType.Annotation) {
            let itemVal = this.Value({AcceptPrefix: false, AcceptSuffix: false});
            return new PrefixItem(PrefixType.Annotation, itemVal);
        }
        else if (prefixType === PrefixType.Modifier) {
            let itemVal = this.KnVectorInner(
                SyntaxConfig.KnotModifierBeginToken,
                SyntaxConfig.KnotModifierEndToken);
            return new PrefixItem(PrefixType.Modifier, itemVal);
        }
        else if (prefixType === PrefixType.TypeParam) {
            let itemVal = this.KnVectorInner(
                SyntaxConfig.KnotTypeParamBeginToken,
                SyntaxConfig.KnotTypeParamEndToken);
            return new PrefixItem(PrefixType.TypeParam, itemVal);
        }
        else if (prefixType === PrefixType.ContextParam) {
            let itemVal = this.KnVectorInner(
                SyntaxConfig.KnotContextParamBeginToken, SyntaxConfig.KnotContextParamEndToken);
            return new PrefixItem(PrefixType.ContextParam, itemVal);
        }

        else if (prefixType === PrefixType.Definition) {
            let itemVal = this.Value({AcceptPrefix: false, AcceptSuffix: false});
            return new PrefixItem(PrefixType.Definition, itemVal);
        }
        // else if (prefixType === PrefixType.TypeWhere) {
        //     let itemVal = this.KnMapInner(SyntaxConfig.MoreAttrOrBlockToken, SyntaxConfig.KnotAttrEndToken);
        //     return new PrefixItem(PrefixType.TypeWhere, itemVal);
        // }
        
        return null;
    }

    ParseSuffixItem() : SuffixItem {
        let suffixItemType = SuffixType.Definition;
        let itemVal = null;
        if (this.currentToken.Type === SyntaxConfig.SuffixComplementToken) {
            suffixItemType = SuffixType.Complement;
            this.Consume(this.currentToken.Type);
            itemVal = this.Value({AcceptPrefix: false, AcceptSuffix: false});
        }
        else if (this.currentToken.Type === SyntaxConfig.SuffixTypeToken) {
            this.Consume(this.currentToken.Type);
            if (this.currentToken.Type === SyntaxConfig.KnotTypeParamBeginToken) {
                suffixItemType = SuffixType.TypeResult;
                itemVal = this.KnVectorInner(SyntaxConfig.KnotTypeParamBeginToken, SyntaxConfig.KnotTypeParamEndToken);
            }
            else {
                suffixItemType = SuffixType.Definition;
                itemVal = this.Value({AcceptPrefix: false, AcceptSuffix: false});
            }
        }
        
        return new SuffixItem(suffixItemType, itemVal);
    }

    ParsePrefixContext(acceptPrefixes: PrefixType[]) : PrefixContext {
        let flags  = [];
        let modifiers = [];
        let annotations = [];

        let contextParams = null;
        let typeWhere = null;
        let definition = null;

        let typeParam = null;
        
        while (this.currentToken.Type === SyntaxConfig.PrefixToken
            || this.currentToken.Type === SyntaxConfig.PrefixTypeToken
            ) {
            let prefix = this.ParsePrefixItem(acceptPrefixes);
            if (prefix == null) {
                break;
            }
            switch (prefix.Type) {
                case PrefixType.Flag:
                    flags.push(prefix.Value);
                    break;
                case PrefixType.Modifier:
                    modifiers = prefix.Value;
                    break;
                case PrefixType.Annotation:
                    annotations.push(prefix.Value);
                    break;
                case PrefixType.ContextParam:
                    contextParams = prefix.Value;
                    break;
                case PrefixType.TypeWhere:
                    typeWhere = prefix.Value;
                    break;
                case PrefixType.Definition:
                    definition = prefix.Value;
                    break;    
                case PrefixType.TypeParam:
                    typeParam = prefix.Value;
                    break;
                
            }
        }
        let result = new PrefixContext();
        result.Flags = flags;
        result.Modifier = modifiers;
        result.Annotation = annotations;
        result.ContextParam = contextParams;
        result.TypeWhere = typeWhere;
        result.Definition = definition;
        result.TypeParams = typeParam;
        
        return result;
    }

    ParseSuffixContext() : SuffixContext {
        let definition = null;
        let typeResult = null;
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
                case SuffixType.TypeResult:
                    typeResult = suffix.Value;
                    break;
                case SuffixType.Complement:
                    complements.push(suffix.Value);
                    break;
            }
        }
        let result = new SuffixContext();
        result.Definition = definition;
        result.TypeResult = typeResult;
        result.Complement = complements;
        return result;
    }

    ValueWithPrefix(config = {AcceptSuffix: true}) {
        let prefixContext = this.ParsePrefixContext(Parser.WORD_KNOT_PREFIX_TYPES);
        let value = this.Value({AcceptPrefix: true, AcceptSuffix: config.AcceptSuffix});
        let valueType = NodeHelper.GetType(value);
        if (valueType !== KnNodeType.KnWord && valueType !== KnNodeType.KnKnot) {
            return value;
        }
        if (prefixContext.Flags.length > 0) {
            value.Flags = prefixContext.Flags;
        }
        if (prefixContext.Modifier.length > 0) {
            value.Modifier = prefixContext.Modifier;
        }
        if (prefixContext.Annotation.length > 0) {
            value.Annotation = prefixContext.Annotation;
        }
        if (prefixContext.ContextParam != null && prefixContext.ContextParam.length > 0) {
            value.ContextParam = prefixContext.ContextParam;
        }
        if (prefixContext.TypeWhere != null) {
            value.TypeWhere = prefixContext.TypeWhere;
        }

        if (prefixContext.Definition != null) {
            value.Definition = prefixContext.Definition;
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
            if (suffixContext.Complement != null) {
                word.Complement = suffixContext.Complement;
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
    UnquoteReplace() {
        this.Consume(TokenType.Comma);
        let v = this.Value();
        return new KnUnquote(v) ;
    }
    UnquoteExpand() {
        this.Consume(TokenType.UnquoteExpand);
        let v = this.Value();
        return new KnUnquoteSplicing(v);
    }
    CloseQuote() {
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

    // Key() {
    //     // return this.String();
    //     if (this.currentToken.Type === TokenType.String) {
    //         return this.String();
    //     } else if (this.currentToken.Type === TokenType.Word) {
    //         const str = this.currentToken.Value;
    //         this.Consume(TokenType.Word);
    //         return str;
    //     } else {
    //         this.Error(`parse key error, line ${this.currentToken.Line}, column ${this.currentToken.Column}`);
    //     }
    // }

    // KeyValPair() {
    //     let key = this.Key();
    //     let val = NodeHelper.Ukn;
    //     if (this.currentToken.Type === SyntaxConfig.MapPairSeperatorToken) {
    //         this.Consume(SyntaxConfig.MapPairSeperatorToken);
    //         val = this.Value();
    //     }
    //     if (SyntaxConfig.EnableCommaSeperator
    //         && this.currentToken.Type === TokenType.Comma
    //     ) {
    //         this.Consume(TokenType.Comma);
    //     }
    //     return [key, val];
    // }

    ParsePairDefaultAsKey() {
        return this.ParsePair(true)
    }

    ParsePairDefaultAsValue() {
        return this.ParsePair(false)
    }

    ParsePair(defaultAsKey) {
        let firstNode = this.Value();
        let secondNode = null;
        this.SkipBlankTokens();
        if (this.currentToken.Type === SyntaxConfig.MapPairSeperatorToken) {
            this.Consume(SyntaxConfig.MapPairSeperatorToken);
            secondNode = this.Value();
            this.SkipBlankTokens();
        }
        let key = null;
        let val = null;
        if (secondNode != null) {
            key = this.AsPairKey(firstNode);
            val = secondNode;
        }
        else if (defaultAsKey) {
            key = this.AsPairKey(firstNode);
            val = NodeHelper.Ukn;
        }
        else {
            val = firstNode;
        }
        return [key, val];
    }

    AsPairKey(parseResult) {
        let nodeType = NodeHelper.GetType(parseResult);
        if (nodeType == KnNodeType.KnString) {
            return parseResult;
        } else if (nodeType == KnNodeType.KnWord) {
            return (parseResult as KnWord).Value;
        }
    }


    KnMap() {
        return this.KnMapInner(SyntaxConfig.MapStartToken, SyntaxConfig.MapEndToken);
    }

    KnMapInner(beginToken, endToken) {
        const result = {};
        this.Consume(beginToken);
        while (this.currentToken.Type != endToken) {
            let pair = this.ParsePairDefaultAsKey();
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

            if (this.currentToken.Type === SyntaxConfig.PrefixTypeToken) {
                let charAfterPrefixToken = this.lexer.Peek(1, 0);
                let prefixType = this.PrefixTokenType(charAfterPrefixToken);
                if (PrefixType.TypeParam == prefixType) {
                    if (!this.KnotAcceptTypeParam(top)) {
                        top = new KnKnot({});
                        nodes.push(top);
                    }
                    let prefixContextInSegment = this.ParsePrefixContext(Parser.KNOT_INNER_PREFIX_TYPES);
                    top.TypeParam = prefixContextInSegment.TypeParams;
                }
                
            }

            else if (this.currentToken.Type === TokenType.Semicolon) {
                this.Consume(null);
                if (!this.KnotAcceptSegmentStop(top)) {
                    top = new KnKnot({});
                    nodes.push(top);
                }
                top.Apply = true;
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
                if (suffixContext.TypeResult != null) {
                    if (!this.KnotAcceptTypeResult(top)
                    ) {
                        top = new KnKnot({});
                        nodes.push(top);
                    }
                    top.TypeResult = suffixContext.TypeResult;
                }
                if (suffixContext.Complement != null) {
                    if (!this.KnotAcceptComplement(top)
                    ) {
                        top = new KnKnot({});
                        nodes.push(top);
                    }
                    top.Complement = suffixContext.Complement;
                }
            }

            // else if (this.currentToken.Type === SyntaxConfig.KnotAttrStartToken) {
            //     if (!this.KnotAcceptAttr(top)) {
            //         top = new KnKnot({});
            //         nodes.push(top);
            //     }
            //     let map = this.KnMapInner(SyntaxConfig.KnotAttrStartToken, SyntaxConfig.KnotAttrEndToken);
            //     top.Attr = map;
            // }

            else if (this.currentToken.Type === SyntaxConfig.MoreAttrOrBlockToken) {
                this.Consume( SyntaxConfig.MoreAttrOrBlockToken);
                let nodeAfterPrefix = this.Value();
                let nodeAfterPrefixType = NodeHelper.GetType(nodeAfterPrefix);
                if (KnNodeType.KnMap == nodeAfterPrefixType) {
                    if (!this.KnotAcceptAttr(top)) {
                        top = new KnKnot({});
                        nodes.push(top);
                    }
                    top.Attr = nodeAfterPrefix;
                } else if (KnNodeType.KnWord == nodeAfterPrefixType) {
                    let tagStr = (nodeAfterPrefix as KnWord).Value;
                    let nodeAfterTag = this.Value();
                    let nodeAfterTagType = NodeHelper.GetType(nodeAfterTag);
                    if (KnNodeType.KnMap == nodeAfterTagType) {
                        if (top.Feature == null) {
                            top.Feature = {};
                        }
                        top.Feature[tagStr] = nodeAfterTag;
                    }
                    else if (KnNodeType.KnVector == nodeAfterTagType) {
                        if (top.Section == null) {
                            top.Section = {};
                        }
                        top.Section[tagStr] = nodeAfterTag;
                    }
                }

            }

            else if (this.currentToken.Type === SyntaxConfig.KnotBlockStartToken) {
                if (!this.KnotAcceptBlock(top)) {
                    top = new KnKnot({});
                    nodes.push(top);
                }
                let vector = this.KnVectorInner(SyntaxConfig.KnotBlockStartToken, SyntaxConfig.KnotBlockEndToken);
                top.Body = vector;
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
        return (knot.Core == null) && this.KnotAcceptTypeParam(knot);
    }

    KnotAcceptTypeParam(knot) {
        return (knot.TypeParam == null)  && this.KnotAcceptParam(knot);
    }

    KnotAcceptSegmentStop(knot) {
        return this.KnotAcceptParam(knot);
    }

    KnotAcceptParam(knot: KnKnot) {
        return (knot.Param == null && knot.Apply != true) && this.KnotAcceptTypeResult(knot);
    }

    KnotAcceptTypeResult(knot: KnKnot) {
        return (knot.TypeResult == null) && this.KnotAcceptComplement(knot);
    }

    KnotAcceptComplement(knot: KnKnot) {
        return (knot.Complement == null || knot.Complement.length == 0) && this.KnotAcceptAttr(knot);
    }

    KnotAcceptAttr(knot : KnKnot) {
        return (knot.Attr == null) && this.KnotAcceptBlock(knot);
    }

    KnotAcceptBlock(knot : KnKnot) {
        return (knot.Body == null);
    }
}

