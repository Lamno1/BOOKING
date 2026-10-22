// Pure helpers for the public review list. Reviews arrive newest first from the server.
export const reviewSorts={recent:'Mới nhất',high:'Điểm cao nhất',low:'Điểm thấp nhất'};
/** Count per star, 5 → 1, with the share of all reviews (0–1). */
export function ratingBreakdown(reviews){
 const total=reviews.length;
 return [5,4,3,2,1].map(stars=>{const count=reviews.filter(r=>r.rating===stars).length;return {stars,count,share:total?count/total:0};});
}
/** Stable sort that keeps newest-first among equal ratings; `stars` (1–5) narrows to one score. */
export function sortReviews(reviews,by='recent',stars=0){
 const list=reviews.map((r,i)=>[r,i]).filter(([r])=>!stars||r.rating===stars);
 const by_={recent:()=>0,high:(a,b)=>b.rating-a.rating,low:(a,b)=>a.rating-b.rating}[by]||(()=>0);
 return list.sort(([a,i],[b,j])=>by_(a,b)||i-j).map(([r])=>r);
}
