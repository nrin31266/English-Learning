def chunk_list(lst, chunk_size):
    for i in range(0, len(lst), chunk_size):
        yield lst[i:i + chunk_size] # Output: [1,2] [3,4] [5] with chunk_size=2
