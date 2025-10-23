export class FormatConfig {
  public static readonly SingleLineConfig = new FormatConfig({
      IndentString: "  ",
      WordMultiLine: false,
      MapMultiLine: false,
      VectorMultiLine: false,
      PrettyExpr: false,
      KnotSegmentsMultiLine: false,
      KnotCoreMultiLine: false,
      KnotTypeParamMultiLine: false,
      KnotAttrMultiLine: false,
      KnotParamMultiLine: false,
      KnotBlockMultiLine: false
  });

  public static readonly MultiLineConfig = new FormatConfig({
      IndentString: "  ",
      WordMultiLine: true,
      MapMultiLine: true,
      VectorMultiLine: true,
      PrettyExpr: true,
      KnotSegmentsMultiLine: true,
      KnotCoreMultiLine: true,
      KnotTypeParamMultiLine: true,
      KnotAttrMultiLine: true,
      KnotParamMultiLine: true,
      KnotBlockMultiLine: true
  });

  public static readonly ExprInnerConfig = new FormatConfig({
      IndentString: "  ",
      WordMultiLine: true,
      MapMultiLine: true,
      VectorMultiLine: true,
      PrettyExpr: true,
      KnotSegmentsMultiLine: true,
      KnotCoreMultiLine: true,
      KnotTypeParamMultiLine: false,
      KnotAttrMultiLine: true,
      KnotParamMultiLine: false,
      KnotBlockMultiLine: true
  });

  public static readonly PrettifyConfig = new FormatConfig({
      IndentString: "  ",
      MapMultiLine: true,
      VectorMultiLine: true,
      PrettyExpr: true,
      KnotSegmentsMultiLine: true,
      KnotCoreMultiLine: false,
      KnotTypeParamMultiLine: false,
      KnotAttrMultiLine: true,
      KnotParamMultiLine: false,
      KnotBlockMultiLine: true
  });

  public IndentString: string;
  public WordMultiLine: boolean;
  public MapMultiLine: boolean;
  public VectorMultiLine: boolean;
  public PrettyExpr: boolean;
  public KnotSegmentsMultiLine: boolean;
  public KnotCoreMultiLine: boolean;
  public KnotTypeParamMultiLine: boolean;
  public KnotAttrMultiLine: boolean;
  public KnotParamMultiLine: boolean;
  public KnotBlockMultiLine: boolean;

  constructor(config: Partial<FormatConfig> = {}) {
      this.IndentString = config.IndentString ?? "  ";
      this.WordMultiLine = config.WordMultiLine ?? false;
      this.MapMultiLine = config.MapMultiLine ?? false;
      this.VectorMultiLine = config.VectorMultiLine ?? false;
      this.PrettyExpr = config.PrettyExpr ?? false;
      this.KnotSegmentsMultiLine = config.KnotSegmentsMultiLine ?? false;
      this.KnotCoreMultiLine = config.KnotCoreMultiLine ?? false;
      this.KnotTypeParamMultiLine = config.KnotTypeParamMultiLine ?? false;
      this.KnotAttrMultiLine = config.KnotAttrMultiLine ?? false;
      this.KnotParamMultiLine = config.KnotParamMultiLine ?? false;
      this.KnotBlockMultiLine = config.KnotBlockMultiLine ?? false;
  }

  public clone(): FormatConfig {
      return new FormatConfig({
          IndentString: this.IndentString,
          WordMultiLine: this.WordMultiLine,
          MapMultiLine: this.MapMultiLine,
          VectorMultiLine: this.VectorMultiLine,
          PrettyExpr: this.PrettyExpr,
          KnotSegmentsMultiLine: this.KnotSegmentsMultiLine,
          KnotCoreMultiLine: this.KnotCoreMultiLine,
          KnotTypeParamMultiLine: this.KnotTypeParamMultiLine,
          KnotAttrMultiLine: this.KnotAttrMultiLine,
          KnotParamMultiLine: this.KnotParamMultiLine,
          KnotBlockMultiLine: this.KnotBlockMultiLine
      });
  }
}

// export interface IFormatConfig {
//   IndentString?: string;
//   MapMultiLine?: boolean;
//   VectorMultiLine?: boolean;
//   PrettyExpr?: boolean;
//   KnotSegmentsMultiLine?: boolean;
//   KnotCoreMultiLine?: boolean;
//   KnotTypeParamMultiLine?: boolean;
//   KnotAttrMultiLine?: boolean;
//   KnotParamMultiLine?: boolean;
//   KnotBlockMultiLine?: boolean;
// }

// export class FormatConfig implements IFormatConfig {
//   public IndentString = "  ";
//   public MapMultiLine = false;
//   public VectorMultiLine = false;
//   public PrettyExpr = false;
//   public KnotSegmentsMultiLine = false;
//   public KnotCoreMultiLine = false;
//   public KnotTypeParamMultiLine = false;
//   public KnotAttrMultiLine = false;
//   public KnotParamMultiLine = false;
//   public KnotBlockMultiLine = false;


//   constructor(conf: IFormatConfig = null) {
//     if (conf == null) {
//       return;
//     }
//     this.IndentString = conf.IndentString;
//     this.MapMultiLine = conf.MapMultiLine;
//     this.VectorMultiLine = conf.VectorMultiLine;
//     this.PrettyExpr = conf.PrettyExpr;
//     this.KnotSegmentsMultiLine = conf.KnotSegmentsMultiLine;
//     this.KnotCoreMultiLine = conf.KnotCoreMultiLine;
//     this.KnotTypeParamMultiLine = conf.KnotTypeParamMultiLine;
//     this.KnotAttrMultiLine = conf.KnotAttrMultiLine;
//     this.KnotParamMultiLine = conf.KnotParamMultiLine;
//     this.KnotBlockMultiLine = conf.KnotBlockMultiLine;
//   }

//   public Clone() {
//     let r = new FormatConfig();
//     r.IndentString = this.IndentString;
//     r.MapMultiLine = this.MapMultiLine;
//     r.VectorMultiLine = this.VectorMultiLine;
//     r.PrettyExpr = this.PrettyExpr;
//     r.KnotSegmentsMultiLine = this.KnotSegmentsMultiLine;
//     r.KnotCoreMultiLine = this.KnotCoreMultiLine;
//     r.KnotTypeParamMultiLine = this.KnotTypeParamMultiLine;
//     r.KnotAttrMultiLine = this.KnotAttrMultiLine;
//     r.KnotParamMultiLine = this.KnotParamMultiLine;
//     r.KnotBlockMultiLine = this.KnotBlockMultiLine;
//     return r;
//   }

//   public static SingleLineConfig = new FormatConfig({
//     IndentString : "  ",
//     MapMultiLine : false,
//     VectorMultiLine : false,
//     PrettyExpr : false,
//     KnotSegmentsMultiLine : false,
//     KnotCoreMultiLine : false,
//     KnotTypeParamMultiLine : false,
//     KnotAttrMultiLine : false,
//     KnotParamMultiLine : false,
//     KnotBlockMultiLine : false
//   });


//   public static MultiLineConfig = new FormatConfig({
//     IndentString : "  ",
//     MapMultiLine : true,
//     VectorMultiLine : true,
//     PrettyExpr : true,
//     KnotSegmentsMultiLine : true,
//     KnotCoreMultiLine : true,
//     KnotTypeParamMultiLine : true,
//     KnotAttrMultiLine : true,
//     KnotParamMultiLine : true,
//     KnotBlockMultiLine : true
//   });

//   public static ExprInnerConfig = new FormatConfig({
//     IndentString : "  ",
//     MapMultiLine : true,
//     VectorMultiLine : true,
//     PrettyExpr : true,
//     KnotSegmentsMultiLine : true,
//     KnotCoreMultiLine : true,
//     KnotTypeParamMultiLine : false,
//     KnotAttrMultiLine : true,
//     KnotParamMultiLine : false,
//     KnotBlockMultiLine : true
//   });

//   public static PrettifyConfig = new FormatConfig({
//     IndentString : "  ",
//     MapMultiLine : true,
//     VectorMultiLine : true,
//     PrettyExpr : true,
//     KnotSegmentsMultiLine : true,
//     KnotCoreMultiLine : false,
//     KnotTypeParamMultiLine : false,
//     KnotAttrMultiLine : true,
//     KnotParamMultiLine : false,
//     KnotBlockMultiLine : true
//   });
// }