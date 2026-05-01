/**
 * 1. after login : server will create a jwt token
 * 2. stotre it in the client side(localstorage,httponly cookies,in memory)
 * 3. For asking for senstive data: send a request with jwt token in teh header
 * 4.server will verify the token. if token is valid; then will provide the data
 * 
 * 
 * --------------------------------- Access token Refres token----------------
 * 
 * 
 * 
 */

/**
 * 1. generate token
 * 
 * <secrect key generation way>
 * in cmd type node then CLI openes to code
 * require('crypto').randomBytes(64).toString('hex')
 * 
 */
