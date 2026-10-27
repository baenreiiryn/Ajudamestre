// Obtain a valid URL before opening a tab. Connector failures stay in Foundry.
export async function beginLogin({bridge,options={},open=url=>window.open(url,'_blank')}) {
  const result=await bridge.call('/auth/start',options);
  let url;
  try {url=new URL(result.url);} catch {throw Error('O conector retornou um endereço de login inválido.');}
  if(url.origin!=='https://auth.openai.com'||url.pathname!=='/api/accounts/authorize'||url.username||url.password)throw Error('O conector retornou um endereço de login inválido.');
  let popup=null;
  try {popup=open(url.href);if(popup)try{popup.opener=null;}catch{/* Some hosts restrict WindowProxy writes. */}}catch{/* Keep the manual link available when the host blocks popups. */}
  return {url:url.href,popupOpened:!!popup};
}
