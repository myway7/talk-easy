import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import type { AccessTokenOptions, VideoGrant } from 'livekit-server-sdk';
import { TokenResult, RoomMetadata } from './types';
import { lru } from '@/lib/lru';

const apiKey = process.env.NEXT_PUBLIC_LIVEKIT_API_KEY;
const apiSecret = process.env.NEXT_PUBLIC_LIVEKIT_API_SECRET;
const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

export const createToken = (userInfo: AccessTokenOptions, grant: VideoGrant) => {
  const at = new AccessToken(process.env.NEXT_PUBLIC_LIVEKIT_API_KEY, process.env.NEXT_PUBLIC_LIVEKIT_API_SECRET, userInfo);
  at.ttl = '5m';
  at.addGrant(grant);
  return at.toJwt();
};
// TODO最后一个人离开房间时重置密码
export async function getToken(req: { identity: any; name: any; passwd: any; roomName: any; metadata?: any; }) {

    const { roomName, identity, name, passwd, metadata } = req;
    console.log({ roomName, identity, name, metadata } )
    const livekitHost = process.env.NEXT_PUBLIC_LK_HTTP_URL;

    const roomService = new RoomServiceClient(process.env.NEXT_PUBLIC_LK_HTTP_URL!, process.env.NEXT_PUBLIC_LIVEKIT_API_KEY, process.env.NEXT_PUBLIC_LIVEKIT_API_SECRET);
    

    const grant: VideoGrant = {
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
      roomAdmin: false
    };

    let metadataObj: any = undefined
    let metadataProcess = metadata;
    const defaultMaxParticipants = process.env.LIVEKIT_DEFAULT_MAXPARTICIPANTS ? parseInt(process.env.LIVEKIT_DEFAULT_MAXPARTICIPANTS) : 10

    try{
        const participants = await roomService.listParticipants(roomName);
        if(participants.length == 0) throw ("room is empty");
        const roomLRUItem: RoomMetadata = lru.get(roomName)
        if(roomLRUItem != undefined && roomLRUItem.maxParticipants > 0 &&
         participants.length >= roomLRUItem.maxParticipants){
            throw ("room is full")
        }
        if(roomLRUItem.passwd != undefined && roomLRUItem.passwd != "" && roomLRUItem.passwd != passwd){
            throw ("passwd error")
        }
    }catch{
        // If room doesn't exist, user is room admin
        grant.roomAdmin = true;
        // set no passwrd
        if(lru.get(roomName)){
            lru.delete(roomName)
        }
        const t: RoomMetadata = {passwd: "", time: new Date().getTime(), maxParticipants: defaultMaxParticipants}
        lru.set(roomName, t)

        try {
          metadataObj = metadata ? {...JSON.parse(metadata), admin: true} : {admin: true};
        } catch (error) {
          metadataObj = {admin: true};
        }

        metadataProcess = JSON.stringify(metadataObj)
    
        // for passwd debug
        // console.log(metadataProcess)
        console.log(`set passwd for ${roomName}`)
        const t2 = lru.get(roomName) as RoomMetadata;
        // console.log(`get passwd for ${roomName}, passwd: ${t2.passwd}`)
    }

    const token = createToken({ identity, name, metadata: metadataProcess }, grant);
    const result: TokenResult = {
      identity,
      accessToken: token,
      isAdmin: grant.roomAdmin as boolean
    };

    return result;
}
