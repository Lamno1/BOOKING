import React from 'react';
import {RoomVisual} from './PropertyExperience';

export const captions=['Không gian chung','Bếp & bàn ăn','Phòng tắm','Giường & cửa sổ'];
const mediaFiles=import.meta.glob('../review/media/*.webp',{eager:true,query:'?url',import:'default'});
export const media=(i,size='large')=>mediaFiles[`../review/media/studio-${i}-${size}.webp`];
export const hasConcept=room=>room.id==='ocean';
export function Photo({room,index=0,hero=false,onClick}){return hasConcept(room)?<button className="journey-photo" onClick={onClick} aria-label={`CONCEPT AI · ${captions[index]} · xem ảnh ${room.number}`}><picture><source media="(max-width:600px)" srcSet={media(index,'small')}/><img width="724" height="543" src={media(index)} loading={hero?'eager':'lazy'} fetchpriority={hero?'high':'auto'} alt={`Ảnh concept AI ${room.number} · ${captions[index]}`}/></picture><span>CONCEPT AI · {captions[index]} ↗</span></button>:<div className="journey-placeholder"><RoomVisual room={room}/><p>Minh họa tiện nghi {room.number} · chưa có bộ ảnh riêng</p></div>;}
