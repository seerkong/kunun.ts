import { KnParserV1 } from "./KnParserV1";
import { KnFormatterV1 } from "./KnFormatterV1";
declare const KnConverter: {
    Knl: {
        Parser: KnParserV1;
        Formater: KnFormatterV1;
    };
    Kon: {
        Parser: KnParserV1;
        Formater: KnFormatterV1;
    };
    Kjson: {
        Parser: KnParserV1;
        Formater: KnFormatterV1;
    };
};
export { KnConverter as KnConverter };
