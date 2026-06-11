"""Bazel macros for building veridocs sites and container images.

Load from a docs project (in this repo or downstream):

    load("@veridocs//bazel:defs.bzl", "veridocs_site", "veridocs_oci_image", "veridocs_img_image")

    veridocs_site(name = "site")

    veridocs_oci_image(name = "image_oci", site = ":site")   # rules_oci pipeline
    veridocs_img_image(name = "image_img", site = ":site")   # rules_img pipeline

`veridocs_site` globs `source/**` and `theme/**` by default, so adding
markdown pages, includes, images, or theme overrides never requires a
BUILD file edit — drop the file in and rebuild.

The image macros put the site behind nginx. They always build linux
images: by default the linux platform matching the host CPU, so
`bazel run //example:image_oci.load` works unmodified on macOS, linux,
x86_64, and arm64.
"""

load("@aspect_bazel_lib//lib:transitions.bzl", "platform_transition_filegroup")
load("@aspect_rules_js//js:defs.bzl", "js_run_binary")
load("@bazel_skylib//rules:copy_file.bzl", "copy_file")
load("@rules_img//img:image.bzl", "image_index", "image_manifest")
load("@rules_img//img:layer.bzl", "image_layer")
load("@rules_img//img:load.bzl", "image_load")
load("@rules_img//img:push.bzl", "image_push")
load("@rules_oci//oci:defs.bzl", "oci_image", "oci_image_index", "oci_load", "oci_push")
load("@tar.bzl//tar:mtree.bzl", "mtree_mutate", "mtree_spec")
load("@tar.bzl//tar:tar.bzl", "tar")

# Labels are resolved against the veridocs module, so downstream projects
# get the CLI and the pinned nginx bases without declaring anything.
_DEFAULT_TOOL = Label("//:veridocs")
_DEFAULT_OCI_BASE = Label("@nginx_alpine")
_DEFAULT_IMG_BASE = Label("@nginx_alpine_img")
_DEFAULT_NGINX_CONF = Label("//bazel:nginx.default.conf")

_LINUX_AMD64 = Label("//bazel/platforms:linux_amd64")
_LINUX_ARM64 = Label("//bazel/platforms:linux_arm64")

_HTML_ROOT = "usr/share/nginx/html"
_NGINX_CONF_PATH = "etc/nginx/conf.d/default.conf"

def _host_cpu_linux_platform():
    """The linux platform matching the CPU we are building on."""
    return select({
        Label("@platforms//cpu:aarch64"): _LINUX_ARM64,
        "//conditions:default": _LINUX_AMD64,
    })

def _path_of(label_str):
    """Workspace-relative output path of a target in this package's repo."""
    label = native.package_relative_label(label_str)
    return (label.package + "/" if label.package else "") + label.name

def veridocs_site(
        name,
        source_dir = "source",
        theme_dir = "theme",
        srcs = None,
        json = False,
        tool = _DEFAULT_TOOL,
        visibility = None,
        **kwargs):
    """Builds a static docs site with `veridocs build`.

    The output is a directory artifact (index.html + assets/ + static
    files), ready to serve or to feed into veridocs_oci_image /
    veridocs_img_image.

    Args:
        name: target name; also the output directory name under bazel-bin.
        source_dir: directory with index.html.md, includes/, images/...
        theme_dir: directory with theme overrides (variables.css, ...).
        srcs: override the default glob of source_dir/** + theme_dir/**.
            Only needed for inputs living outside those two directories.
        json: also emit docs.json (parsed AST for custom frontends).
        tool: the veridocs CLI binary to run.
        visibility: forwarded to the site target.
        **kwargs: forwarded to js_run_binary.
    """
    if srcs == None:
        srcs = native.glob([source_dir + "/**"]) + native.glob(
            [theme_dir + "/**"],
            allow_empty = True,
        )

    prefix = native.package_name() + "/" if native.package_name() else ""
    args = [
        "build",
        "--source",
        prefix + source_dir,
        "--theme",
        prefix + theme_dir,
        "--out",
        prefix + name,
    ]
    if json:
        args.append("--json")

    js_run_binary(
        name = name,
        srcs = srcs,
        args = args,
        mnemonic = "VeridocsBuild",
        out_dirs = [name],
        progress_message = "Building docs site %{label}",
        tool = tool,
        visibility = visibility,
        **kwargs
    )

def _nginx_layer_tars(name, site, nginx_conf):
    """tar layers (for rules_oci) placing the site and config into nginx paths."""

    # Site layer: the site directory artifact, re-rooted at the nginx html dir.
    mtree_spec(
        name = name + ".site.spec",
        srcs = [site],
    )
    mtree_mutate(
        name = name + ".site.mtree",
        mtree = ":" + name + ".site.spec",
        package_dir = _HTML_ROOT,
        strip_prefix = _path_of(site),
    )
    tar(
        name = name + ".site.layer",
        srcs = [site],
        mtree = ":" + name + ".site.mtree",
    )

    # Config layer: copy into the final in-image path, then strip the
    # package scratch dir so the tar starts at etc/.
    conf_scratch = name + ".conf"
    copy_file(
        name = conf_scratch + ".copy",
        src = nginx_conf,
        out = conf_scratch + "/" + _NGINX_CONF_PATH,
    )
    mtree_spec(
        name = name + ".conf.spec",
        srcs = [":" + conf_scratch + ".copy"],
    )
    mtree_mutate(
        name = name + ".conf.mtree",
        mtree = ":" + name + ".conf.spec",
        strip_prefix = _path_of(":" + conf_scratch),
    )
    tar(
        name = name + ".conf.layer",
        srcs = [":" + conf_scratch + ".copy"],
        mtree = ":" + name + ".conf.mtree",
    )

    return [":" + name + ".conf.layer", ":" + name + ".site.layer"]

def veridocs_oci_image(
        name,
        site,
        repo_tags = None,
        nginx_conf = _DEFAULT_NGINX_CONF,
        base = _DEFAULT_OCI_BASE,
        repository = None,
        remote_tags = ["latest"],
        visibility = None):
    """nginx container image serving a veridocs_site, built with rules_oci.

    Targets created:
        <name>          image for linux on the host CPU
        <name>.load     `bazel run` to load into the local docker daemon
        <name>.index    multi-arch (amd64 + arm64) image index
        <name>.push     `bazel run` to push the index (if repository is set)

    Args:
        name: target name prefix.
        site: a veridocs_site target (any directory artifact works).
        repo_tags: tags applied by <name>.load; default ["<name>:latest"].
        nginx_conf: nginx server config; defaults to the one veridocs ships.
        base: base image; defaults to the pinned nginx:alpine.
        repository: push destination, e.g. "ghcr.io/acme/docs". Optional.
        remote_tags: tags applied by <name>.push.
        visibility: forwarded to the image targets.
    """
    tars = _nginx_layer_tars(name, site, nginx_conf)

    # The actual image, built for whatever linux platform is requested.
    oci_image(
        name = name + ".linux",
        base = base,
        tars = tars,
        visibility = ["//visibility:private"],
    )

    # Pin the platform so host builds (e.g. macOS) produce a linux image.
    platform_transition_filegroup(
        name = name,
        srcs = [":" + name + ".linux"],
        target_platform = _host_cpu_linux_platform(),
        visibility = visibility,
    )

    oci_load(
        name = name + ".load",
        image = ":" + name,
        repo_tags = repo_tags or [name + ":latest"],
    )

    platform_transition_filegroup(
        name = name + ".linux_amd64",
        srcs = [":" + name + ".linux"],
        target_platform = _LINUX_AMD64,
        visibility = ["//visibility:private"],
    )
    platform_transition_filegroup(
        name = name + ".linux_arm64",
        srcs = [":" + name + ".linux"],
        target_platform = _LINUX_ARM64,
        visibility = ["//visibility:private"],
    )
    oci_image_index(
        name = name + ".index",
        images = [
            ":" + name + ".linux_amd64",
            ":" + name + ".linux_arm64",
        ],
        visibility = visibility,
    )

    if repository:
        oci_push(
            name = name + ".push",
            image = ":" + name + ".index",
            remote_tags = remote_tags,
            repository = repository,
        )

def veridocs_img_image(
        name,
        site,
        tag = None,
        nginx_conf = _DEFAULT_NGINX_CONF,
        base = _DEFAULT_IMG_BASE,
        registry = None,
        repository = None,
        remote_tags = ["latest"],
        visibility = None):
    """nginx container image serving a veridocs_site, built with rules_img.

    Same shape as veridocs_oci_image, using the rules_img pipeline
    (shallow base pulls, no layer tars to assemble by hand).

    Targets created:
        <name>          image manifest for linux on the host CPU
        <name>.load     `bazel run` to load into the local daemon
        <name>.index    multi-arch (amd64 + arm64) image index
        <name>.push     `bazel run` to push the index (if repository is set)

    Args:
        name: target name prefix.
        site: a veridocs_site target (any directory artifact works).
        tag: tag applied by <name>.load; default "<name>:latest".
        nginx_conf: nginx server config; defaults to the one veridocs ships.
        base: base image; defaults to the pinned nginx:alpine.
        registry: push registry, e.g. "ghcr.io". Optional.
        repository: push repository, e.g. "acme/docs". Optional.
        remote_tags: tags applied by <name>.push.
        visibility: forwarded to the image targets.
    """
    image_layer(
        name = name + ".conf.layer",
        srcs = {"/" + _NGINX_CONF_PATH: nginx_conf},
    )
    image_layer(
        name = name + ".site.layer",
        srcs = {"/" + _HTML_ROOT: site},
    )
    layers = [
        ":" + name + ".conf.layer",
        ":" + name + ".site.layer",
    ]

    # `platform` pins linux for host builds; under the .index split
    # transition the select re-resolves to each split's own platform, so
    # both stay consistent.
    image_manifest(
        name = name,
        base = base,
        layers = layers,
        platform = _host_cpu_linux_platform(),
        visibility = visibility,
    )

    image_load(
        name = name + ".load",
        image = ":" + name,
        tag = tag or name + ":latest",
    )

    image_index(
        name = name + ".index",
        manifests = [":" + name],
        platforms = [
            _LINUX_AMD64,
            _LINUX_ARM64,
        ],
        visibility = visibility,
    )

    if repository:
        image_push(
            name = name + ".push",
            image = ":" + name + ".index",
            registry = registry,
            repository = repository,
            tag_list = remote_tags,
        )
