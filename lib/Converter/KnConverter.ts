import { KjsonSyntaxConfig } from "./KonSyntaxConfig";
import { KnlSyntaxConfig } from "./KnlSyntaxConfig";
import { KnParserV1 } from "./KnParserV1";
import { KnFormatterV1 } from "./KnFormatterV1";

const KnConverter = {
  Knl: {
    Parser: new KnParserV1(new KnlSyntaxConfig()),
    Formater: new KnFormatterV1(new KnlSyntaxConfig()),
  },
  Kjson: {
    Parser: new KnParserV1(new KjsonSyntaxConfig()),
    Formater: new KnFormatterV1(new KjsonSyntaxConfig()),
  }
}
export { KnConverter as KnConverter };