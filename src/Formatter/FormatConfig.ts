export class FormatConfig {
  public IndentString = "  ";
  public MapMultiLine = false;
  public VectorMultiLine = false;
  public PrettyExpr = false;
  public KnotSegmentsMultiLine = false;
  public KnotCoreMultiLine = false;
  public KnotTypeParamMultiLine = false;
  public KnotHeaderMultiLine = false;
  public KnotParamMultiLine = false;
  public KnotBodyMultiLine = false;


  constructor(conf = null) {
    if (conf == null) {
      return;
    }
    this.IndentString = conf.IndentString;
    this.MapMultiLine = conf.MapMultiLine;
    this.VectorMultiLine = conf.VectorMultiLine;
    this.PrettyExpr = conf.PrettyExpr;
    this.KnotSegmentsMultiLine = conf.KnotSegmentsMultiLine;
    this.KnotCoreMultiLine = conf.KnotCoreMultiLine;
    this.KnotTypeParamMultiLine = conf.KnotTypeParamMultiLine;
    this.KnotHeaderMultiLine = conf.KnotHeaderMultiLine;
    this.KnotParamMultiLine = conf.KnotParamMultiLine;
    this.KnotBodyMultiLine = conf.KnotBodyMultiLine;
  }

  public Clone() {
    let r = new FormatConfig();
    r.IndentString = this.IndentString;
    r.MapMultiLine = this.MapMultiLine;
    r.VectorMultiLine = this.VectorMultiLine;
    r.PrettyExpr = this.PrettyExpr;
    r.KnotSegmentsMultiLine = this.KnotSegmentsMultiLine;
    r.KnotCoreMultiLine = this.KnotCoreMultiLine;
    r.KnotTypeParamMultiLine = this.KnotTypeParamMultiLine;
    r.KnotHeaderMultiLine = this.KnotHeaderMultiLine;
    r.KnotParamMultiLine = this.KnotParamMultiLine;
    r.KnotBodyMultiLine = this.KnotBodyMultiLine;
    return r;
  }

  public static SingleLineConfig = new FormatConfig({
    IndentString : "  ",
    MapMultiLine : false,
    VectorMultiLine : false,
    PrettyExpr : false,
    KnotSegmentsMultiLine : false,
    KnotCoreMultiLine : false,
    KnotTypeParamMultiLine : false,
    KnotHeaderMultiLine : false,
    KnotParamMultiLine : false,
    KnotBodyMultiLine : false
  });


  public static MultiLineConfig = new FormatConfig({
    IndentString : "  ",
    MapMultiLine : true,
    VectorMultiLine : true,
    PrettyExpr : true,
    KnotSegmentsMultiLine : true,
    KnotCoreMultiLine : true,
    KnotTypeParamMultiLine : true,
    KnotHeaderMultiLine : true,
    KnotParamMultiLine : true,
    KnotBodyMultiLine : true
  });

  public static ExprInnerConfig = new FormatConfig({
    IndentString : "  ",
    MapMultiLine : true,
    VectorMultiLine : true,
    PrettyExpr : true,
    KnotSegmentsMultiLine : true,
    KnotCoreMultiLine : true,
    KnotTypeParamMultiLine : false,
    KnotHeaderMultiLine : true,
    KnotParamMultiLine : false,
    KnotBodyMultiLine : true
  });

  public static PrettifyConfig = new FormatConfig({
    IndentString : "  ",
    MapMultiLine : true,
    VectorMultiLine : true,
    PrettyExpr : true,
    KnotSegmentsMultiLine : true,
    KnotCoreMultiLine : false,
    KnotTypeParamMultiLine : false,
    KnotHeaderMultiLine : true,
    KnotParamMultiLine : false,
    KnotBodyMultiLine : true
  });
}