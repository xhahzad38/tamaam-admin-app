export interface ApiResponse<T> {
    succeeded: boolean;
    message?: string;
    errors?: string[];
    data: T;
}

export interface PageResult<T> {
    items: T[];
    totalCount: number;
}
