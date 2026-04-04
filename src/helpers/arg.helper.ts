let DIR_PATH = ''
let PORT = 0
let SESS_KEY = ''
let BASE_URL = '';

export const setBaseUrl = (url: string) => { BASE_URL = url; };

export const getBaseUrl = () => {
  if (!BASE_URL) throw new Error('BASE_URL is not set');
  return BASE_URL;
};

export const setWorkDirPath = (path:string)=>{
    DIR_PATH = path
}

export const getWorkDirPath = ()=>{
    if(DIR_PATH.trim()==='') throw new Error('DIR_PATH is not set')
    return DIR_PATH
}

export const setPort = (port:number)=>{
    PORT = port
}
export const setSessKey = (sessKey:string)=>{
    SESS_KEY = sessKey
}

export const getSessKey = ()=>{
    if(SESS_KEY.trim()==='') throw new Error('SESS_KEY is not set, please set it using -s | --session-key <sessKey> flag')
    return SESS_KEY
}

export const getPort = ()=>{
    if(PORT===0) throw new Error('PORT is not set')
    return PORT
}
