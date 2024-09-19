// // A URI is composed from an allowed set of ASCII characters consisting of reserved characters (gen-delims: :, /, ?, #, [, ], and @; sub-delims: !, $, &, ', (, ), *, +, ,, ;, and =),[23] unreserved characters (uppercase and lowercase letters, decimal digits, -, ., _, and ~),[23] and the character %.[24] Syntax components and subcomponents are separated by delimiters from the reserved characters (only from generic reserved characters for components) and define identifying data represented as unreserved characters, reserved characters that do not act as delimiters in the component and subcomponent respectively,[13]: §2  and percent-encodings when the corresponding character is outside the allowed set or is being used as a delimiter of, or within, the component. A percent-encoding of an identifying data octet is a sequence of three characters, consisting of the character % followed by the two hexadecimal digits representing that octet's numeric value.[13]: §2.1 
//
//
// // @ (64)
// // if '\\' (92 before reserved, it the next character as not reserved)
// /**
//  * reserved    = gen-delims / sub-delims
//  *
//  * gen-delims  = ":" / "/" / "?" / "#" / "[" / "]" / "@"
//  *
//  * sub-delims  = "!" / "$" / "&" / "'" / "(" / ")"
//  *                   / "*" / "+" / "," / ";" / "="
//  *
//  * unreserved  = ALPHA / DIGIT / "-" / "." / "_" / "~"
//  */
//
// const A = 65;
// const Z = 90;
// const a = 97;
// const z = 122;
//
// function isAlpha(dec: number): boolean {
//   return (dec >= A && dec <= Z) || // uppercase
//     (dec >= a && dec <= z); // lowercase
// }
//
// const zero = 48;
// const nine = 57;
//
// function isDigit(dec: number): boolean {
//   return dec >= zero && dec <= nine;
// }
//
// const plus = 43;
// const minus = 45;
// const dot = 46;
//
// /**
//  * scheme      = ALPHA *( ALPHA / DIGIT / "+" / "-" / "." )
//  */
// function uriScheme(string: string): string {
//   // alpha 65-90 && 97-122
//
// }
