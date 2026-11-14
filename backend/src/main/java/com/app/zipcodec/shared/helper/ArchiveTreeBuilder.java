package com.app.zipcodec.shared.helper;

import com.app.zipcodec.model.ArchiveNode;
import com.app.zipcodec.shared.exceptions.InvalidPayloadException;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;


/**
 * Builds the recursive archive tree node
 */
public final class ArchiveTreeBuilder {
    private final MutableDirectory root = new MutableDirectory("", "", false);
    private int maxDepth;

    /**
     * Creates the directory chain for {@param path}
     */
    public void addDirectory(String path) {
        resolveDirectory(path, false);
        maxDepth = Math.max(maxDepth, segmentsOf(path).length);
    }

    /**
     * Inserts {@param file}, creating any missing parent directories
     */
    public void addFile(String path, ArchiveNode.File file) {
        String[] segments = segmentsOf(path);
        MutableDirectory parent = root;
        for (int i = 0; i < segments.length - 1; i++) {
            parent = parent.childDirectory(segments[i], false);
        }
        String leaf = segments[segments.length - 1];
        if (parent.files.containsKey(leaf) || parent.directories.containsKey(leaf)) {
            throw new InvalidPayloadException("Duplicate archive entry: " + path);
        }
        parent.files.put(leaf, file);
        maxDepth = Math.max(maxDepth, segments.length);
    }

    /**
     * Marks {@param path} as an expanded nested archive and returns a builder view
     * whose insertions are rooted at that path.
     */
    public NestedScope nestedArchiveAt(String path) {
        MutableDirectory directory = resolveDirectory(path, true);
        maxDepth = Math.max(maxDepth, segmentsOf(path).length);
        return new NestedScope(this, directory, path);
    }

    public ArchiveNode.Directory build() {
        return ArchiveNode.Directory.root(root.childNodes());
    }

    public int maxDepth() {
        return maxDepth;
    }

    private MutableDirectory resolveDirectory(String path, boolean nestedArchive) {
        MutableDirectory current = root;
        String[] segments = segmentsOf(path);
        for (int i = 0; i < segments.length; i++) {
            boolean last = i == segments.length - 1;
            current = current.childDirectory(segments[i], last && nestedArchive);
        }
        return current;
    }

    private static String[] segmentsOf(String path) {
        if (path == null || path.isEmpty()) {
            throw new InvalidPayloadException("Entry path must not be empty");
        }
        return path.split("/");
    }

    /**
     * Insertion view scoped to an expanded nested archive
     */
    public static final class NestedScope {
        private final ArchiveTreeBuilder owner;
        private final MutableDirectory base;
        private final String basePath;

        private NestedScope(ArchiveTreeBuilder owner, MutableDirectory base, String basePath) {
            this.owner = owner;
            this.base = base;
            this.basePath = basePath;
        }

        public String absolutePath(String relativePath) {
            return basePath + "/" + relativePath;
        }

        public void addDirectory(String relativePath) {
            MutableDirectory current = base;
            for (String segment : segmentsOf(relativePath)) {
                current = current.childDirectory(segment, false);
            }
            owner.maxDepth = Math.max(owner.maxDepth, depthOf(relativePath));
        }
        public void addFile(String relativePath, ArchiveNode.File file) {
            String[] segments = segmentsOf(relativePath);
            MutableDirectory parent = base;
            for (int i = 0; i < segments.length - 1; i++) {
                parent = parent.childDirectory(segments[i], false);
            }
            parent.files.put(segments[segments.length - 1], file);
            owner.maxDepth = Math.max(owner.maxDepth, depthOf(relativePath));
        }

        public NestedScope nestedArchiveAt(String relativePath) {
            MutableDirectory current = base;
            String[] segments = segmentsOf(relativePath);
            for (int i = 0; i < segments.length; i++) {
                current = current.childDirectory(segments[i], i == segments.length - 1);
            }
            owner.maxDepth = Math.max(owner.maxDepth, depthOf(relativePath));
            return new NestedScope(owner, current, absolutePath(relativePath));
        }
        private int depthOf(String relativePath) {
            return segmentsOf(basePath).length + segmentsOf(relativePath).length;
        }
    }

    private static final class MutableDirectory {
        private final String name;
        private final String path;
        private boolean nestedArchive;
        private final Map<String, MutableDirectory> directories = new LinkedHashMap<>();
        private final Map<String, ArchiveNode.File> files = new LinkedHashMap<>();

        private MutableDirectory(String name, String path, boolean nestedArchive) {
            this.name = name;
            this.path = path;
            this.nestedArchive = nestedArchive;
        }

        private MutableDirectory childDirectory(String childName, boolean nested) {
            MutableDirectory child = directories.computeIfAbsent(childName,
                    key -> new MutableDirectory(key, path.isEmpty() ? key : path + "/" + key, nested));
            if (nested) {
                child.nestedArchive = true;
            }
            return child;
        }

        private List<ArchiveNode> childNodes() {
            List<ArchiveNode> children = new ArrayList<>(directories.size() + files.size());
            directories.values().forEach(directory -> children.add(directory.toNode()));
            children.addAll(files.values());
            return children;
        }

        private ArchiveNode.Directory toNode() {
            return new ArchiveNode.Directory(name, path, nestedArchive, childNodes());
        }
    }
}
