"""
Core definitions of FiftyOne dataset views.

| Copyright 2017-2020, Voxel51, Inc.
| `voxel51.com <https://voxel51.com/>`_
|
"""
# pragma pylint: disable=redefined-builtin
# pragma pylint: disable=unused-wildcard-import
# pragma pylint: disable=wildcard-import
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals
from builtins import *

# pragma pylint: enable=redefined-builtin
# pragma pylint: enable=unused-wildcard-import
# pragma pylint: enable=wildcard-import

from copy import deepcopy

from pymongo import ASCENDING, DESCENDING

import fiftyone.core.collections as foc


class DatasetView(object):
    def __init__(self, dataset):
        self.dataset = dataset
        self._pipeline = []

    def __len__(self):
        raise NotImplementedError("TODO")

    def iter_samples(self):
        raise NotImplementedError("TODO")

    def sample(self, size):
        raise NotImplementedError("TODO")
        stage = {"$sample": {"size": size}}


class DEPRECATEDDatasetView(foc.SampleCollection):
    """A view into a :class:`fiftyone.core.dataset.Dataset`.

    Dataset views represent read-only collections of
    :class:`fiftyone.core.sample.Sample` instances in a dataset.

    Operations on dataset views are designed to be chained together to yield
    the desired subset of the dataset, which is then iterated over to directly
    access the samples.

    Example use::

        # Print the metadata of the five largest samples in the dataset
        view = (dataset.view()
            sort_by("metadata.size_bytes")
            take(5)
        )
        for sample in view:
            print(sample.metadata)

    Args:
        dataset: a :class:`fiftyone.core.dataset.Dataset`
    """

    def __init__(self, dataset):
        self._dataset = dataset
        self._pipeline = []

    def __len__(self):
        return next(
            self._dataset._c.aggregate(self._pipeline + [{"$count": "count"}])
        )["count"]

    def __getitem__(self, sample_id):
        return self._dataset[sample_id]

    def iter_samples(self):
        """Returns an iterator over the :class:`fiftyone.core.sample.Sample`
        instances in the view.

        Returns:
            an iterator over :class:`fiftyone.core.sample.Sample` instances
        """
        for s in self._dataset._c.aggregate(self._pipeline):
            yield self._dataset._deserialize_sample(s)

    def iter_samples_with_index(self):
        """Returns an iterator over the  a dataset

        Returns:
            an iterator of ``(view_idx, sample)`` tuples, where:

                view_idx: the index relative to the last ``offset``::

                    offset <= view_idx < offset + limit

                sample: a :class:`fiftyone.core.sample.Sample` instance
        """
        view_idx = self._get_latest_offset() - 1
        for s in self._dataset._c.aggregate(self._pipeline):
            view_idx += 1
            yield view_idx, self._dataset._deserialize_sample(s)

    #
    # @todo(brian) I think this should be deleted. Views should be inherently
    # tied to a single dataset from the start
    #
    @classmethod
    def from_view(cls, view, dataset):
        new_view = cls(dataset)
        new_view._pipeline = deepcopy(view._pipeline)
        return new_view

    # VIEW OPERATIONS #########################################################

    def filter(
        self, tag=None, insight_group=None, label_group=None, filter=None
    ):
        """Filters the samples in the view by the given filter.

        Args:
            tag: a sample tag string
            insight_group: an insight group string
            label_group: a label group string
            filter: a MongoDB query dict

        Returns:
            a :class:`DatasetView`
        """
        view = self

        if tag is not None:
            view = view._add_stage_to_pipeline(stage={"$match": {"tags": tag}})

        if insight_group is not None:
            # @todo(Tyler) should this filter the insights as well? or just
            # filter the samples based on whether or not the insight is
            # present?
            raise NotImplementedError("TODO")

        if label_group is not None:
            # @todo(Tyler) should this filter the labels as well? or just
            # filter the samples based on whether or not the label is
            # present?
            raise NotImplementedError("TODO")

        if filter is not None:
            view = view._add_stage_to_pipeline(stage={"$match": filter})

        return view

    def sort_by(self, field, reverse=False):
        """Sorts the samples in the view by the given field.

        Args:
            field: the field to sort by. Example fields::

                filename
                metadata.size_bytes
                metadata.frame_size[0]

            reverse (False): whether to return the results in descending order

        Returns:
            a :class:`DatasetView`
        """
        order = DESCENDING if reverse else ASCENDING
        return self._add_stage_to_pipeline({"$sort": {field: order}})

    def take(self, size, random=False):
        """Takes the given number of samples from the view.

        Args:
            size: the number of samples to return
            random (False): whether to randomly select the samples

        Returns:
            a :class:`DatasetView`
        """
        if random:
            return self._add_stage_to_pipeline({"$sample": {"size": size}})

        return self._add_stage_to_pipeline({"$limit": size})

    def offset(self, offset):
        """Omits the given number of samples from the head of the view.

        Args:
            offset: the offset

        Returns:
            a :class:`DatasetView`
        """
        return self._add_stage_to_pipeline({"$skip": offset})

    def select_samples(self, sample_ids):
        """Selects only the samples with the given IDs from the view.

        Args:
            sample_ids: an iterable of sample IDs

        Returns:
            a :class:`DatasetView`
        """
        raise NotImplementedError("Not yet implemented")

    def remove_samples(self, sample_ids):
        """Removes the samples with the given IDS from the view.

        Args:
            sample_ids: an iterable of sample IDs

        Returns:
            a :class:`DatasetView`
        """
        raise NotImplementedError("Not yet implemented")

    # PRIVATE #################################################################

    def _add_stage_to_pipeline(self, stage):
        new_view = self.__class__(self._dataset)
        new_view._pipeline = deepcopy(self._pipeline)
        new_view._pipeline.append(stage)
        return new_view

    def _get_latest_offset(self):
        """Returns the offset of the last $skip stage."""
        for stage in self._pipeline[::-1]:
            if "$skip" in stage:
                return stage["$skip"]

        return 0
