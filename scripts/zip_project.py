
import os
import zipfile

def zip_project(directory, zip_name):
    with zipfile.ZipFile(zip_name, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(directory):
            for file in files:
                zipf.write(os.path.join(root, file), os.path.relpath(os.path.join(root, file), directory))

project_directory = 'ONE_Project'  # Your project directory
zip_filename = 'ONE_Project.zip'  # Desired zip file name

zip_project(project_directory, zip_filename)
print(f"Project zipped successfully into {zip_filename}")
