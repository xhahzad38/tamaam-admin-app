import { Routes } from '@angular/router';
import { SellerReviewDetail } from './seller-review-detail';
import { SellerReviewList } from './seller-review-list';

export default [
    { path: '', component: SellerReviewList },
    { path: ':organizationId', component: SellerReviewDetail }
] as Routes;
