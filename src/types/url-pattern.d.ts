type URLPatternInput=string|Record<string,string>;
interface URLPatternOptions{ignoreCase?:boolean}
declare class URLPattern{
 constructor(input?:URLPatternInput,baseURL?:string,options?:URLPatternOptions);
 test(input?:URLPatternInput,baseURL?:string):boolean;
 exec(input?:URLPatternInput,baseURL?:string):unknown;
}
