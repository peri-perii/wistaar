from pathlib import Path

uncached_txt = Path('graphify-out/.graphify_uncached.txt').read_text()
uncached_files = uncached_txt.strip().split('\n')

# Split into chunks of 20-25 files
chunk_size = 23
chunks = [uncached_files[i:i+chunk_size] for i in range(0, len(uncached_files), chunk_size)]

for idx, chunk in enumerate(chunks, 1):
    chunk_file = Path(f'graphify-out/.graphify_chunk_{idx}.txt')
    chunk_file.write_text('\n'.join(chunk))
    print(f'Chunk {idx}: {len(chunk)} files')

print(f'\nTotal: {len(chunks)} chunks, {len(uncached_files)} files')
