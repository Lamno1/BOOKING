import test from 'node:test';
import assert from 'node:assert/strict';
import {ratingBreakdown,sortReviews} from '../src/features/reviews/reviews-domain.js';

const reviews=[{id:'a',rating:4},{id:'b',rating:5},{id:'c',rating:2},{id:'d',rating:5}];
test('breakdown counts each score from 5 down to 1 with its share',()=>{
 assert.deepEqual(ratingBreakdown(reviews).map(r=>[r.stars,r.count,r.share]),[[5,2,.5],[4,1,.25],[3,0,0],[2,1,.25],[1,0,0]]);
 assert.deepEqual(ratingBreakdown([]).map(r=>r.share),[0,0,0,0,0]);
});
test('sorting keeps newest first among equal scores and can narrow to one score',()=>{
 assert.deepEqual(sortReviews(reviews).map(r=>r.id),['a','b','c','d']);
 assert.deepEqual(sortReviews(reviews,'high').map(r=>r.id),['b','d','a','c']);
 assert.deepEqual(sortReviews(reviews,'low').map(r=>r.id),['c','a','b','d']);
 assert.deepEqual(sortReviews(reviews,'recent',5).map(r=>r.id),['b','d']);
});
