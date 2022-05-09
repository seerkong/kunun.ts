import { FormatConfig } from "./FormatConfig";
import { FormatContextType } from "./FormatContextType";

export class FormatState {
  public IndentLevel : number = 0;
  public Config : FormatConfig;
  public ContextType : FormatContextType = FormatContextType.KnotBody;

  constructor(indentLevel = 0, config : FormatConfig = FormatConfig.SingleLineConfig, contextType : FormatContextType = FormatContextType.KnotBody) {
    this.IndentLevel = indentLevel;
    this.Config = config;
    this.ContextType = contextType;
  }
}