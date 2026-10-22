import React from 'react';
import {RoomVisual} from './PropertyExperience';

// AI illustrations per room type (scripts/prepare-review-images.py). They show the type, not a specific room,
// and every place they appear says so; a type without a set falls back to the amenity diagram.
const sets={
 studio:{key:'studio',captions:['Không gian chung','Bếp & bàn ăn','Phòng tắm','Giường & cửa sổ']},
 quad:{key:'quad',captions:['Hai giường đôi','Bàn & tủ đồ','Phòng tắm','Đầu giường']},
};
const mediaFiles=import.meta.glob('../../../review/media/*.webp',{eager:true,query:'?url',import:'default'});
const setFor=room=>sets[room?.typeId]||null;
export const hasConcept=room=>!!setFor(room);
export const captionsFor=room=>setFor(room)?.captions||[];
export const media=(room,i,size='large')=>{const set=setFor(room);return set?mediaFiles[`../../../review/media/${set.key}-${i}-${size}.webp`]:undefined;};
export const AI_NOTE='Ảnh minh họa do AI tạo theo loại phòng, không phải ảnh chụp phòng thực tế';
export function Photo({room,index=0,hero=false,onClick}){
 const captions=captionsFor(room);
 return hasConcept(room)?<button className="journey-photo" onClick={onClick} aria-label={`Ảnh minh họa AI · ${captions[index]} · ${room.typeName} · xem lớn`}><picture><source media="(max-width:600px)" srcSet={media(room,index,'small')}/><img width="724" height="543" src={media(room,index)} loading={hero?'eager':'lazy'} fetchpriority={hero?'high':'auto'} alt={`Ảnh minh họa AI ${room.typeName} · ${captions[index]}`}/></picture><span>ẢNH MINH HỌA AI · {captions[index]} ↗</span></button>
  :<div className="journey-placeholder"><RoomVisual room={room}/><p>Minh họa tiện nghi {room.number} · chưa có ảnh cho loại phòng này</p></div>;
}
