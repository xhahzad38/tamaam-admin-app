import { Routes } from '@angular/router';
import { SellerReviewDetail } from './pages/seller-review-detail/seller-review-detail';
import { SellerReviewList } from './pages/seller-review-list/seller-review-list';

export default [
    { path: '', component: SellerReviewList },
    { path: ':organizationId', component: SellerReviewDetail }
] as Routes;
